pipeline {
    agent any

    environment {
        // Inject the saved session file from Jenkins Credentials
        CHATGPT_SESSION = credentials('chatgpt-session-json')
    }

    stages {

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
                sh 'npx playwright install chromium'
            }
        }

        stage('Inject Auth Session') {
            steps {
                // Copy the secret session file into the expected location
                sh 'mkdir -p auth'
                sh 'cp $CHATGPT_SESSION auth/session.json'
                echo 'Session file injected from Jenkins credentials.'
            }
        }

        stage('Run Playwright Tests') {
            steps {
                sh 'npm test'
            }
            post {
                failure {
                    echo '''
                    =====================================================
                    TEST FAILED — If session expired, do this locally:
                      1. Run: npm run auth
                      2. Log in with Google in the browser
                      3. Upload new auth/session.json to Jenkins Credentials
                         (Jenkins → Credentials → chatgpt-session-json → Update)
                    =====================================================
                    '''
                }
            }
        }

    }

    post {
        always {
            // Publish the Playwright HTML report
            publishHTML(target: [
                reportName : 'Playwright Report',
                reportDir  : 'playwright-report',
                reportFiles: 'index.html',
                keepAll    : true,
                alwaysLinkToLastBuild: true
            ])
        }
        success {
            echo 'Tests passed! Email was sent with ChatGPT response.'
        }
        failure {
            echo 'Tests failed. Check the Playwright report.'
        }
    }
}
