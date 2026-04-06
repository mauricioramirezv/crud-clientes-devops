pipeline {
    agent any

    environment {
        SONAR_PROJECT_KEY = 'crud-clientes'
        SONAR_PROJECT_NAME = 'CRUD Clientes'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'python -m pip install --upgrade pip'
                bat 'python -m pip install -r requirements.txt'
            }
        }

        stage('Run Tests with Coverage') {
            steps {
                bat 'python -m pytest'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                    withSonarQubeEnv('SonarQube') {
                        bat """
                        "${scannerHome}\\bin\\sonar-scanner.bat" ^
                          -Dsonar.projectKey=%SONAR_PROJECT_KEY% ^
                          -Dsonar.projectName=%SONAR_PROJECT_NAME% ^
                          -Dsonar.sources=src ^
                          -Dsonar.tests=tests ^
                          -Dsonar.python.version=3.13 ^
                          -Dsonar.python.coverage.reportPaths=coverage.xml ^
                          -Dsonar.sourceEncoding=UTF-8
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
    }

    post {
        always {
            archiveArtifacts artifacts: 'coverage.xml', fingerprint: true
        }
    }
}