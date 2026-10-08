# CRUD Clientes DevOps

Aplicación web para la gestión de clientes, desarrollada con FastAPI y JavaScript. El proyecto incorpora pruebas automatizadas independientes para backend y frontend, cobertura, análisis estático con SonarQube, Quality Gate, integración continua con Jenkins y despliegue con Docker.

## Funcionalidades

- Registrar clientes.
- Listar clientes.
- Consultar clientes por identificador.
- Editar clientes.
- Eliminar clientes.
- Validar nombres y correos electrónicos.
- Evitar registros con correos duplicados.
- Consultar el estado de la aplicación.
- Probar la API mediante Swagger UI.

## Tecnologías

### Backend

- Python 3.13
- FastAPI
- Uvicorn
- Pytest
- Pytest-cov

### Frontend

- HTML5
- CSS3
- JavaScript
- Node.js 22
- Vitest
- jsdom

### DevOps

- GitHub
- Jenkins
- SonarQube
- PostgreSQL
- Docker

## Estructura

```text
crud-clientes-devops/
├── backend/
│   ├── src/
│   │   └── clientes/
│   │       ├── api.py
│   │       ├── exceptions.py
│   │       ├── models.py
│   │       ├── repository.py
│   │       └── service.py
│   ├── tests/
│   │   ├── test_api.py
│   │   ├── test_repository.py
│   │   └── test_service.py
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── tests/
│   │   └── app.test.js
│   ├── app.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── styles.css
│   └── vitest.config.js
├── jenkins-image/
│   └── Dockerfile
├── .dockerignore
├── .gitignore
├── Dockerfile
├── Jenkinsfile
├── README.md
└── sonar-project.properties
```

## Preparar el backend

Crear el entorno virtual:

```powershell
python -m venv .venv
```

Activarlo en PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

Instalar dependencias:

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

## Ejecutar pruebas del backend

Desde la raíz del proyecto:

```powershell
Set-Location backend
python -m pytest
Set-Location ..
```

La configuración exige una cobertura mínima del 90 % y genera:

```text
backend/coverage.xml
```

## Ejecutar pruebas del frontend

Las pruebas se pueden ejecutar mediante Node.js en Docker:

```powershell
docker run --rm `
    -v "${PWD}\frontend:/app" `
    -w /app `
    node:22-alpine `
    npm ci
```

Ejecutar las pruebas:

```powershell
docker run --rm `
    -v "${PWD}\frontend:/app" `
    -w /app `
    node:22-alpine `
    npm test
```

Ejecutar pruebas con cobertura:

```powershell
docker run --rm `
    -v "${PWD}\frontend:/app" `
    -w /app `
    node:22-alpine `
    npm run test:coverage
```

El informe para SonarQube se genera en:

```text
frontend/coverage/lcov.info
```

## Ejecutar la aplicación localmente

```powershell
python -m uvicorn clientes.api:app `
    --host 127.0.0.1 `
    --port 8000 `
    --app-dir backend/src `
    --reload
```

Servicios disponibles:

| Servicio | Dirección |
|---|---|
| Interfaz web | http://localhost:8000/ |
| Estado de la API | http://localhost:8000/health |
| Swagger UI | http://localhost:8000/docs |
| OpenAPI | http://localhost:8000/openapi.json |
| Clientes | http://localhost:8000/clientes |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Mostrar la interfaz web |
| GET | `/health` | Verificar el estado de la API |
| POST | `/clientes` | Crear un cliente |
| GET | `/clientes` | Listar clientes |
| GET | `/clientes/{cliente_id}` | Consultar un cliente |
| PUT | `/clientes/{cliente_id}` | Actualizar un cliente |
| DELETE | `/clientes/{cliente_id}` | Eliminar un cliente |

## Construir la imagen Docker

```powershell
docker build -t crud-clientes-api .
```

## Ejecutar con Docker

```powershell
docker run -d `
    --name crud-clientes-api-container `
    --restart unless-stopped `
    -p 8000:8000 `
    crud-clientes-api
```

Verificar:

```powershell
docker ps --filter "name=crud-clientes-api-container"

docker inspect crud-clientes-api-container `
    --format '{{.State.Health.Status}}'
```

## SonarQube

Configuración del proyecto:

```text
Project key: crud-clientes-devops
Project name: CRUD Clientes DevOps
```

SonarQube analiza:

- Código Python del backend.
- Código JavaScript del frontend.
- Pruebas del backend.
- Pruebas del frontend.
- Cobertura Python mediante `coverage.xml`.
- Cobertura JavaScript mediante `lcov.info`.

El token se almacena como credencial secreta en Jenkins y no debe guardarse en GitHub.

## Pipeline de Jenkins

El pipeline ejecuta:

1. Verificación de Python, Java, Docker y Node.js.
2. Instalación de dependencias del backend.
3. Pruebas y cobertura del backend.
4. Pruebas y cobertura del frontend.
5. Análisis con SonarQube.
6. Validación del Quality Gate.
7. Construcción de la imagen Docker.
8. Despliegue de la aplicación.
9. Verificación de salud del contenedor.

El despliegue solamente continúa si las pruebas y el Quality Gate son aprobados.

## Servicios DevOps

La infraestructura local, el arranque automatizado, los plugins, las
credenciales externas al repositorio, el Quality Gate y las limitaciones del
despliegue se documentan en [la guía DevOps](devops/GUIA.md). Las evidencias
incluidas corresponden al 22 de septiembre de 2026; la guía distingue esos
resultados de las pruebas locales ejecutadas al preparar el PR.

| Servicio | Dirección |
|---|---|
| Aplicación | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Jenkins | http://localhost:8080 |
| SonarQube | http://localhost:9000 |

## Autor

Gabriel Mauricio Ramírez Villegas
