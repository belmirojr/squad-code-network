"""Build the dependency-free, standalone SQUAD/CODE interface.

    python build.py          writes index.html
    python build.py --copy   also writes ../squad-code-network.html (a copy next to the repo folder)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def build(copy: bool = False) -> None:
    # Re-embed the avatar gallery from assets/*.png when Pillow is available; otherwise keep src/avatars.js.
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('build_avatars', ROOT / 'scripts/build-avatars.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        module.build_avatars()
    except ImportError:
        print('Pillow not installed: keeping the existing src/avatars.js')
    css = (ROOT / 'src/styles.css').read_text(encoding='utf-8')
    scripts = '\n'.join(
        (ROOT / 'src' / filename).read_text(encoding='utf-8')
        for filename in ['portraits.js', 'avatars.js', 'conventions.js', 'souls.js', 'vendor/three.min.js', 'city.js', 'app.js']
    )
    html = (ROOT / 'src/shell.html').read_text(encoding='utf-8')
    html = html.replace('<!--STYLE-->', '<style>\n' + css + '\n</style>')
    html = html.replace('<!--SCRIPTS-->', '<script>\n' + scripts + '\n</script>')
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    if copy:
        (ROOT.parent / 'squad-code-network.html').write_text(html, encoding='utf-8')
        print(f'Copied to {ROOT.parent / "squad-code-network.html"}')
    print(f'Built {len(html.encode("utf-8")) // 1024} KB self-contained HTML')


if __name__ == '__main__':
    build(copy='--copy' in sys.argv[1:])
