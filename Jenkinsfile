pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        SONAR_PROJECT_KEY = 'crud-clientes-devops'
        SONAR_PROJECT_NAME = 'CRUD Clientes DevOps'
        VENV_DIR = '.venv'
        IMAGE_NAME = 'crud-clientes-api'
        CONTAINER_NAME = 'crud-clientes-api-container'
    }

    stages {
        stage('Checkout and Prepare') {
            steps {
                git branch: 'main', url: 'https://github.com/mauricioramirezv/crud-clientes-devops.git'
                // Upstream loads an ES module as a classic script. Keep this
                // correction explicit until it is incorporated upstream.
                sh '''
                    set -eu
                    python3 - <<'PY'
from pathlib import Path
page = Path('frontend/index.html')
old = '<script src="/static/app.js" defer></script>'
new = '<script type="module" src="/static/app.js"></script>'
text = page.read_text(encoding='utf-8')
if old not in text and new not in text:
    raise SystemExit('Unexpected app.js script tag; review upstream HTML')
page.write_text(text.replace(old, new), encoding='utf-8')
PY
                '''
            }
        }
        stage('Verify Environment') {
            steps {
                sh '''
                    set -e
                    python3 --version
                    docker --version
                    java -version
                    docker run --rm node:22-alpine node --version
                '''
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                sh '''
                    set -e
                    python3 -m venv --clear "$VENV_DIR"
                    . "$VENV_DIR/bin/activate"
                    python -m pip install --upgrade pip
                    python -m pip install \
                        -r backend/requirements.txt
                '''
            }
        }

        stage('Backend Tests') {
            steps {
                sh '''
                    set -e
                    . "$VENV_DIR/bin/activate"
                    cd backend
                    python -m pytest \
                        --junitxml=../backend-test-results.xml
                '''
            }
        }

        stage('Frontend Tests') {
            steps {
                sh '''
                    set -e

                    docker run --rm \
                        --user "$(id -u):$(id -g)" \
                        -e HOME=/tmp \
                        -v jenkins_home:/var/jenkins_home \
                        -w "$WORKSPACE/frontend" \
                        node:22-alpine \
                        sh -c "npm ci && npm run test:coverage"
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool(
                        name: 'SonarScanner',
                        type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    )

                    withSonarQubeEnv('SonarQube') {
                        sh """
                            set -e
                            "${scannerHome}/bin/sonar-scanner"
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e
                    docker build \
                        --pull \
                        -t "$IMAGE_NAME:$BUILD_NUMBER" \
                        -t "$IMAGE_NAME:latest" \
                        .
                '''
            }
        }

        stage('Deploy Application') {
            steps {
                sh '''
                    set -e

                    docker rm -f "$CONTAINER_NAME" \
                        2>/dev/null || true

                    docker run -d \
                        --name "$CONTAINER_NAME" \
                        --restart unless-stopped \
                        --network devops-net \
                        -p 127.0.0.1:8000:8000 \
                        "$IMAGE_NAME:$BUILD_NUMBER"
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    set -e

                    for attempt in $(seq 1 12); do
                        HEALTH_STATUS=$(docker inspect \
                            --format='{{.State.Health.Status}}' \
                            "$CONTAINER_NAME" \
                            2>/dev/null || true)

                        echo "Estado: $HEALTH_STATUS"

                        if [ "$HEALTH_STATUS" = "healthy" ]; then
                            exit 0
                        fi

                        if [ "$HEALTH_STATUS" = "unhealthy" ]; then
                            docker logs "$CONTAINER_NAME"
                            exit 1
                        fi

                        sleep 5
                    done

                    docker logs "$CONTAINER_NAME"
                    echo "El contenedor no alcanzo el estado healthy."
                    exit 1
                '''
            }
        }
    }

    post {
        always {
            junit(
                testResults: 'backend-test-results.xml',
                allowEmptyResults: true
            )

            archiveArtifacts(
                artifacts: [
                    'backend/coverage.xml',
                    'frontend/coverage/lcov.info',
                    'backend-test-results.xml'
                ].join(','),
                fingerprint: true,
                allowEmptyArchive: true
            )
        }

        failure {
            sh '''
                docker logs "$CONTAINER_NAME" \
                    2>/dev/null || true
            '''
        }
    }
}
