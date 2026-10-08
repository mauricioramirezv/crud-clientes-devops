import jenkins.model.Jenkins
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy

def instance = Jenkins.get()
if (instance.getSecurityRealm() instanceof HudsonPrivateSecurityRealm) return
def realm = new HudsonPrivateSecurityRealm(false)
realm.createAccount('admin', new File('/run/secrets/jenkins_password').text.trim())
instance.setSecurityRealm(realm)
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)
instance.setNumExecutors(2)
instance.save()
