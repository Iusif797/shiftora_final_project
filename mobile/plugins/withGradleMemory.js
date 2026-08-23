// Oprava OOM při Android buildu (ukol-427):
// Zdvojení MaxMetaspaceSize 512m→1024m — daemon explicitně hlásil
// 'running out of JVM Metaspace' při :expo:compileReleaseJavaWithJavac
// 2. oprava: workers.max=2 — Worker Daemon 10 timeout po 120s (8 CPU, 4.5Gi RAM)
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    // Heap + MetaSpace pro Gradle daemon i Worker Daemons
    const jvmIdx = props.findIndex(p => p.key === 'org.gradle.jvmargs');
    const newJvmValue = '-Xmx2048m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError';
    if (jvmIdx >= 0) {
      props[jvmIdx] = { type: 'property', key: 'org.gradle.jvmargs', value: newJvmValue };
    } else {
      props.push({ type: 'property', key: 'org.gradle.jvmargs', value: newJvmValue });
    }

    // Omezení paralelních Worker Daemon procesů (8 CPU, 4.5Gi RAM → risk OOM kill)
    const wIdx = props.findIndex(p => p.key === 'org.gradle.workers.max');
    if (wIdx >= 0) {
      props[wIdx] = { type: 'property', key: 'org.gradle.workers.max', value: '2' };
    } else {
      props.push({ type: 'property', key: 'org.gradle.workers.max', value: '2' });
    }

    return config;
  });
};
