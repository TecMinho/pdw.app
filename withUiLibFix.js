const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withUiLibFix(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
   
    // Keep your existing PackageList fix script underneath (react-native-ui-lib auto-linking issue)
    const fixScript = `
// Forcefully purge HighlighterViewPackage and KeyboardInputPackage from PackageList.java
gradle.projectsEvaluated {
    tasks.matching { it.name.contains("compileReleaseJavaWithJavac") || it.name.contains("compileDebugJavaWithJavac") }.all { task ->
        task.doFirst {
            def packageListFile = file("\${project.buildDir}/generated/autolinking/src/main/java/com/facebook/react/PackageList.java")
            if (packageListFile.exists()) {
                println "---------- [EXPO RNUILib AUTO-PATCH] Cleaning PackageList.java ----------"
                def content = packageListFile.text
                content = content.replace("new HighlighterViewPackage(),", "")
                content = content.replace("new KeyboardInputPackage(getApplication()),", "")
                content = content.replace("import com.wix.reactnativeuilib.highlighterview.HighlighterViewPackage;", "")
                content = content.replace("import com.wix.reactnativeuilib.keyboardinput.KeyboardInputPackage;", "")
                packageListFile.text = content
                println "---------- [EXPO RNUILib AUTO-PATCH] PackageList.java clean complete ----------"
            }
        }
    }
}
`;

    if (!buildGradle.includes('[EXPO RNUILib AUTO-PATCH]')) {
      buildGradle = buildGradle + fixScript;
    }
    
    config.modResults.contents = buildGradle;
    return config;
  });
};
