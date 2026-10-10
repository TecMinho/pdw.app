const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withUiLibV7Fix(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
   
    // Forcefully purge HighlighterViewPackage, TextInputDelKeyHandlerPackage, and KeyboardInputPackage from PackageList.java
    const fixScript = `
gradle.projectsEvaluated {
    tasks.matching { it.name.contains("compileReleaseJavaWithJavac") || it.name.contains("compileDebugJavaWithJavac") }.all { task ->
        task.doFirst {
            def packageListFile = file("\${project.buildDir}/generated/autolinking/src/main/java/com/facebook/react/PackageList.java")
            if (packageListFile.exists()) {
                println "---------- [EXPO RNUILib V7 AUTO-PATCH] Cleaning PackageList.java ----------"
                def content = packageListFile.text
                
                // Remove Package Instantiations
                content = content.replace("new HighlighterViewPackage(),", "")
                content = content.replace("new TextInputDelKeyHandlerPackage(),", "")
                content = content.replace("new KeyboardInputPackage(getApplication()),", "")
                
                // Remove Package Imports
                content = content.replace("import com.wix.reactnativeuilib.highlighterview.HighlighterViewPackage;", "")
                content = content.replace("import com.wix.reactnativeuilib.textinput.TextInputDelKeyHandlerPackage;", "")
                content = content.replace("import com.wix.reactnativeuilib.keyboardinput.KeyboardInputPackage;", "")
                
                packageListFile.text = content
                println "---------- [EXPO RNUILib V7 AUTO-PATCH] PackageList.java clean complete ----------"
            }
        }
    }
}
`;

    if (!buildGradle.includes('[EXPO RNUILib V7 AUTO-PATCH]')) {
      buildGradle = buildGradle + fixScript;
    }
    
    config.modResults.contents = buildGradle;
    return config;
  });
};
