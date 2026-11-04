import pathlib, re, sys

root = pathlib.Path('android/app/src/main')
man = root / 'AndroidManifest.xml'
s = man.read_text()
assert 'FileProvider' in s and '.fileprovider' in s, 'FileProvider entry missing from AndroidManifest.xml'
if '<queries>' not in s:
    s = s.replace('</manifest>', '    <queries>\n        <package android:name="com.whatsapp" />\n        <package android:name="com.whatsapp.w4b" />\n    </queries>\n</manifest>')
assert '<queries>' in s
man.write_text(s)

paths = root / 'res/xml/file_paths.xml'
p = paths.read_text()
if 'cache-path' not in p:
    p = p.replace('</paths>', '    <cache-path name="shared_cache" path="." />\n</paths>')
    paths.write_text(p)
assert 'cache-path' in paths.read_text()

mains = list(root.glob('java/**/MainActivity.java'))
assert len(mains) == 1, 'MainActivity.java not found'
main = mains[0]
pkg = re.search(r'^package\s+([\w.]+);', main.read_text(), re.M).group(1)
main.write_text(f'''package {pkg};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {{
    @Override
    public void onCreate(Bundle savedInstanceState) {{
        registerPlugin(WaSharePlugin.class);
        super.onCreate(savedInstanceState);
    }}
}}
''')
tpl = pathlib.Path('native/WaSharePlugin.java.tpl').read_text().replace('__PKG__', pkg)
(main.parent / 'WaSharePlugin.java').write_text(tpl)

gradle = root.parent.parent / 'build.gradle'
g = gradle.read_text()
if 'def androidVersionCode =' not in g:
    android_block = re.search(r'(?m)^android\s*\{', g)
    if not android_block:
        raise RuntimeError('Android build.gradle has no android block')
    version_code = (
        'def androidVersionCode = (System.getenv("ANDROID_VERSION_CODE") ?: "1").toInteger()\n\n'
    )
    g = g[:android_block.start()] + version_code + g[android_block.start():]
if 'versionCode androidVersionCode' not in g:
    g = g.replace(
        'versionCode (System.getenv("ANDROID_VERSION_CODE") ?: "1").toInteger()',
        'versionCode androidVersionCode',
    )
    g, version_count = re.subn(
        r'(?m)^([ \t]*)versionCode\s+\d+\s*$',
        r'\1versionCode androidVersionCode',
        g,
        count=1,
    )
    if version_count != 1 and 'versionCode androidVersionCode' not in g:
        raise RuntimeError('Android build.gradle has no versionCode to update')
if 'signingConfigs {' not in g:
    build_types = re.search(r'(?m)^([ \t]*)buildTypes\s*\{', g)
    if not build_types:
        raise RuntimeError('Android build.gradle has no buildTypes block')
    indent = build_types.group(1)
    signing = (
        f'{indent}signingConfigs {{\n'
        f'{indent}    release {{\n'
        f'{indent}        storeFile file("mlc-release.keystore")\n'
        f'{indent}        storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n'
        f'{indent}        keyAlias System.getenv("ANDROID_KEY_ALIAS")\n'
        f'{indent}        keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n'
        f'{indent}    }}\n'
        f'{indent}}}\n'
    )
    g = g[:build_types.start()] + signing + g[build_types.start():]

build_types = re.search(r'(?m)^[ \t]*buildTypes\s*\{', g)
release = re.search(r'(?m)^([ \t]*)release\s*\{', g[build_types.end():]) if build_types else None
if not release:
    raise RuntimeError('Android build.gradle has no release build type')
release_start = build_types.end() + release.end()
release_indent = release.group(1) + '    '
if 'signingConfig signingConfigs.release' not in g[release_start:release_start + 160]:
    g = g[:release_start] + f'\n{release_indent}signingConfig signingConfigs.release' + g[release_start:]
gradle.write_text(g)
print('Patched Android project, package', pkg)
