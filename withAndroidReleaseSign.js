const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withUiLibFix(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    
    // Structural injection: We safely append our signing configurations at the very bottom
    // of the gradle execution pipeline using an afterEvaluate block. This overrides the internal defaults completely.
    const customSigningOverride = `
// Secure Production Signing Overrides
// The gradle variables are defined in the global gradle.properties file (~/.gradle/gradle.properties) and are injected into the build.gradle file at runtime. 
// This allows us to keep our signing credentials out of source control and maintain a secure build process.
android {
    signingConfigs {
        release {
            if (project.hasProperty('PDW_RELEASE_STORE_FILE')) {
                storeFile file(PDW_RELEASE_STORE_FILE)
                storePassword PDW_RELEASE_STORE_PASSWORD
                keyAlias PDW_RELEASE_STORE_KEY_ALIAS
                keyPassword PDW_RELEASE_STORE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}

// Runtime console logger for verification
tasks.whenTaskAdded { task ->
    if (task.name == "validateSigningRelease") {
        task.doFirst {
            println "👉 ACTIVE RELEASE SIGNING STORE FILE: " + android.buildTypes.release.signingConfig.storeFile
        }
    }
}
`;

    if (!buildGradle.includes('Secure Production Signing Overrides')) {
      buildGradle = buildGradle + customSigningOverride;
    }
    
    config.modResults.contents = buildGradle;
    return config;
  });
};
