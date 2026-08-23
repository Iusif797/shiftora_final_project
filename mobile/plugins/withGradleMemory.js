// Oprava OOM při Android buildu (ukol-427):
// Zdvojení MaxMetaspaceSize 512m→1024m — daemon explicitně hlásil
// 'running out of JVM Metaspace' při :expo:compileReleaseJavaWithJavac
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const idx = props.findIndex(p => p.key === 'org.gradle.jvmargs');
    const newValue = '-Xmx2048m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError';
    if (idx >= 0) {
      props[idx] = { type: 'property', key: 'org.gradle.jvmargs', value: newValue };
    } else {
      props.push({ type: 'property', key: 'org.gradle.jvmargs', value: newValue });
    }
    return config;
  });
};
