# Clase 13: Jenkins, SonarQube y despliegue

## Alcance

Repositorio original: https://github.com/mauricioramirezv/crud-clientes-devops.git

La copia inicial corresponde al commit `6071af2597248bb1a792b9f29a9d8c3bc89f8698`.
La versión actual incluye backend FastAPI y frontend JavaScript. Por eso su
Jenkinsfile prueba ambos, aunque las diapositivas describen una versión anterior
con 17 pruebas. Los resultados reales se deben tomar de cada ejecución.

## Infraestructura y arranque

Se reutiliza SonarQube en `http://localhost:9000`, con PostgreSQL y volúmenes
persistentes existentes. Los proyectos de La Morada conservan su configuración.
Jenkins utiliza el volumen `jenkins_home` y comparte la red `devops-net` con
SonarQube. La aplicación se publica en el puerto 8000.

Desde la raíz de esta copia, con Docker Desktop y SonarQube activos:

```powershell
./devops/start.ps1
```

El script configura SonarQube, construye e inicia Jenkins, configura la tarea y
solicita una ejecución. El final del script confirma el envío, no el resultado
del pipeline. Consultar la tarea hasta que termine:

```powershell
node devops/jenkins-api.cjs /job/crud-clientes-devops/lastBuild/api/json
node devops/jenkins-api.cjs /job/crud-clientes-devops/lastBuild/consoleText
```

La preparación de SonarQube admite `SONAR_ADMIN_TOKEN` y
`SONAR_ADMIN_PASSWORD`. En este equipo utiliza por defecto la credencial local
existente de La Morada. Las contraseñas nuevas y el token del proyecto quedan
fuera del repositorio, en `%LOCALAPPDATA%/CrudClientesDevOps/credentials.json`.
Usuario de Jenkins: `admin`; contraseña: campo `jenkinsPassword` de ese archivo.
Usuario técnico de SonarQube: `jenkins-crud`.

Este es un laboratorio local. Jenkins tiene acceso privilegiado al socket de
Docker para construir y desplegar; su interfaz se publica solo en localhost.

## Plugins

| Nombre de la diapositiva | Identificador instalado |
|---|---|
| SonarQube Scanner for Jenkins | sonar |
| Pipeline | workflow-aggregator |
| Pipeline: Stage View | pipeline-stage-view |
| Git | git |
| Credentials | credentials |
| Credentials Binding | credentials-binding |
| Pipeline: Declarative | pipeline-model-definition |

También se instalan `timestamper` y `junit`, usados por el Jenkinsfile actual.
La imagen incorpora Python, venv, Git, Docker CLI, Java y SonarScanner CLI
7.2.0.5079. Los plugins resuelven sus dependencias con `jenkins-plugin-cli`.

## Configuración en Jenkins

- **Manage Jenkins → System → SonarQube servers:** nombre `SonarQube`, URL
  `http://sonarqube:9000`, credencial `sonarqube-crud-token`.
- **Manage Jenkins → Tools → SonarQube Scanner:** nombre `SonarScanner`, ruta
  `/opt/sonar-scanner`.
- **Credentials:** token de análisis restringido al proyecto, almacenado como
  Secret text. El pipeline no utiliza un token de administrador.
- **Tarea `crud-clientes-devops`:** Pipeline script, cargado automáticamente
  desde el `Jenkinsfile` de esta entrega. Su primera etapa descarga con Git la
  rama `main` del repositorio original.
- **Poll SCM:** `H/5 * * * *`. Jenkins consulta cambios cada cinco minutos y
  ejecuta el pipeline cuando detecta un commit nuevo. Esto evita necesitar una
  URL pública para un webhook de GitHub en este laboratorio local.

Los scripts de infraestructura y la corrección del frontend se publican en una
rama del fork para revisión mediante PR hacia el repositorio original.
La tarea descarga la aplicación directamente del repositorio indicado por el
usuario y aplica una corrección explícita: `app.js` debe cargarse con
`type="module"` porque usa `await` y `export`. El HTML original lo carga como
script clásico, lo que rompe el formulario en el navegador aunque las pruebas
unitarias pasen. Esta corrección aparece tanto en el HTML local como en la etapa
`Checkout and Prepare` del Jenkinsfile, y no se oculta dentro de la imagen.

Se usa Pipeline script porque el repositorio del docente todavía contiene ese
defecto en la referencia inicial de esta entrega. El PR no cambia automáticamente
la tarea local ni la rama `main` del docente. Para usar
**Pipeline script from SCM** en una copia propia, publicar esta entrega en tu
repositorio, configurar su URL/rama y `Jenkinsfile`, y ajustar la etapa de
checkout para descargar esa misma copia. No configurar el Jenkinsfile original
del docente omitiendo la corrección.

## Proyecto y Quality Gate

Proyecto: **CRUD Clientes DevOps**, clave `crud-clientes-devops`.
Gate exclusivo: **CRUD Clientes - Quality Gate**. No se cambia el gate global.
Las diapositivas piden configurar el gate, pero no fijan umbrales numéricos.
Estos umbrales son decisiones de implementación y el 90 % coincide con el
mínimo configurado por el repositorio para sus pruebas de backend.

| Alcance | Condición para aprobar |
|---|---|
| Código total | Cobertura ≥ 90 % |
| Código total | Líneas duplicadas ≤ 3 % |
| Código total | Fiabilidad, seguridad y mantenibilidad: A |
| Código total | Hotspots de seguridad revisados: 100 % |
| Código nuevo | Cobertura ≥ 90 % |
| Código nuevo | Líneas duplicadas ≤ 3 % |
| Código nuevo | Cero issues nuevos |
| Código nuevo | Hotspots nuevos revisados: 100 % |

SonarQube usa métricas MQR para las calificaciones. El código nuevo se define
respecto de la versión anterior. El primer análisis crea la referencia; los
controles globales impiden que el primer despliegue dependa solo de métricas
nuevas todavía no disponibles. Se desactiva la excepción de cambios menores
a 20 líneas para cobertura y duplicación en este proyecto.

El usuario técnico tiene Execute Analysis, Browse y See Source Code únicamente
en este proyecto. Webhook del proyecto:
`http://jenkins:8080/sonarqube-webhook/`. Se deja sin secreto conforme al entorno
local indicado en la diapositiva 15.

## Ejecución y despliegue

1. Descargar el código de GitHub, corregir la carga del módulo y verificar herramientas.
2. Instalar dependencias de backend en un entorno virtual.
3. Ejecutar pytest, cobertura XML y reporte JUnit.
4. Ejecutar Vitest y cobertura LCOV usando Node 22 en Docker.
5. Analizar Python y JavaScript con SonarQube.
6. Esperar `waitForQualityGate abortPipeline: true` y bloquear el despliegue si falla.
7. Construir la imagen con etiquetas de número de build y `latest`.
8. Reemplazar el contenedor `crud-clientes-api-container`.
9. Esperar el estado Docker `healthy`.

El despliegue utiliza la red `devops-net` y publica el puerto exclusivamente
en `127.0.0.1:8000`. Para verificar todas las operaciones sobre el servicio:

```powershell
node devops/verify-deployment.cjs
node devops/export-evidence.cjs
```

La aplicación original guarda clientes en memoria: un reinicio o redespliegue
borra sus datos. El despliegue original reemplaza el contenedor y tiene un
intervalo de indisponibilidad; no implementa rollback automático.

## Comprobación y evidencias

- Jenkins: http://localhost:8080/job/crud-clientes-devops/
- SonarQube: http://localhost:9000/dashboard?id=crud-clientes-devops
- Aplicación: http://localhost:8000/
- Swagger: http://localhost:8000/docs
- Salud: http://localhost:8000/health

Guardar evidencia de las etapas verdes, pruebas, Quality Gate, métricas,
entrega del webhook y estado saludable. `evidence/quality-gate-config.json`
contiene la configuración consultada al servidor; por sí sola no demuestra
que el análisis haya aprobado.

### Evidencias históricas y verificación del PR

Los archivos de `devops/evidence/` son capturas de la ejecución del 22 de
septiembre de 2026; no certifican la ejecución de la rama del PR. Registran
Quality Gate `OK`, cobertura SonarQube de 99,5 %, duplicación de 0 % y cuatro
observaciones menores de mantenibilidad. `deployment-smoke.json` registra
las nueve comprobaciones HTTP aprobadas. `webhook-deliveries.json` registra
una entrega **fallida** (`success: false`); por tanto, estas evidencias no
demuestran que Jenkins haya recibido el webhook ni terminado todo el pipeline.

El 8 de octubre de 2026 se verificó localmente el código del PR:

- Backend: 26 pruebas aprobadas, cobertura 98,60 % (Python 3.12.14).
- Frontend: 18 pruebas aprobadas, cobertura 100 % con Vitest.
- Sintaxis de los cinco scripts `.cjs` y análisis sintáctico de `start.ps1`.
- `git diff --check` sin errores de espacios.

En esta preparación no se volvió a ejecutar el pipeline completo ni el
despliegue. Para validar esos pasos se requieren Docker Desktop, SonarQube,
las credenciales locales y la recepción correcta del webhook. La etapa
`Checkout and Prepare` sigue descargando `main` del repositorio original:
para probar la aplicación de una rama del fork, ajustar su URL y rama en esa
etapa antes de ejecutar Jenkins. `setup-jenkins.cjs` carga el Jenkinsfile local
como Pipeline script, por lo que sus modificaciones requieren volver a
ejecutar ese script de configuración.

## Referencias

- Material suministrado: `Clase13- Pipeline_DevOps.pptx`, diapositivas 7–21.
- https://www.jenkins.io/doc/book/installing/docker/
- https://www.jenkins.io/doc/book/managing/plugins/
- https://www.jenkins.io/doc/pipeline/steps/sonar/
- https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/ci-integration/jenkins-integration/pipeline-pause
