const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withUiLibV7Patch(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        if (!podfileContent.includes('ReactNativeUiLib')) {
          podfileContent = podfileContent.replace(
            'post_install do |installer|',
            `post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name.include?("ReactNativeUiLib") || target.name.include?("uilib")
      target.build_configurations.each do |config|
        # 👇 ADDED $(inherited) HERE to pull in Yoga and native compiler flags automatically
        config.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) $(PODS_ROOT)/Headers/Public/React-Core $(PODS_ROOT)/Headers/Public'
      end
    end
  end`
          );
          fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        }
      }
      return config;
    }
  ]);
};
