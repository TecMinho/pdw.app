const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withUiLibFix(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    
    // 1. Target the end of signingConfigs.debug to safely append the release keys
    const targetSigningBlock = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

    const secureSigningScript = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('PDW_RELEASE_STORE_FILE')) {
                storeFile file(PDW_RELEASE_STORE_FILE)
                storePassword PDW_RELEASE_STORE_PASSWORD
                keyAlias PDW_RELEASE_STORE_KEY_ALIAS
                keyPassword PDW_RELEASE_STORE_KEY_PASSWORD
            }
        }
    }`;

    if (buildGradle.includes(targetSigningBlock)) {
      buildGradle = buildGradle.replace(targetSigningBlock, secureSigningScript);
    }

    // 2. Locate the release block signature and redirect it from using the debug key
    const targetReleaseBlock = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

    const updatedReleaseBlock = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.release`;

    if (buildGradle.includes(targetReleaseBlock)) {
      buildGradle = buildGradle.replace(targetReleaseBlock, updatedReleaseBlock);
    }

    // 3. Keep your existing PackageList fix script underneath (react-native-ui-lib auto-linking issue)
    const fixScript = `
// Forcefully purge HighlighterViewPackage and KeyboardInputPackage from PackageList.java
gradle.projectsEvaluated {
    tasks.matching { it.name.contains("compileReleaseJavaWithJavac") || it.name.contains("compileDebugJavaWithJavac") }.all { task ->
        task.doFirst {
            def packageListFile = file("\${project.buildDir}/generated/autolinking/src/main/java/com/facebook/react/PackageList.java")
            if (packageListFile.exists()) {
                println "---------- [EXPO AUTO-PATCH] Cleaning PackageList.java ----------"
                def content = packageListFile.text
                content = content.replace("new HighlighterViewPackage(),", "")
                content = content.replace("new KeyboardInputPackage(getApplication()),", "")
                content = content.replace("import com.wix.reactnativeuilib.highlighterview.HighlighterViewPackage;", "")
                content = content.replace("import com.wix.reactnativeuilib.keyboardinput.KeyboardInputPackage;", "")
                packageListFile.text = content
                println "---------- [EXPO AUTO-PATCH] PackageList.java clean complete ----------"
            }
        }
    }
}
`;

    if (!buildGradle.includes('[EXPO AUTO-PATCH]')) {
      buildGradle = buildGradle + fixScript;
    }
    
    config.modResults.contents = buildGradle;
    return config;
  });
};
