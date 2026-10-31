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
print('Patched Android project, package', pkg)
