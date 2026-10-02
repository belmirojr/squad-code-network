from playwright.sync_api import sync_playwright
from pathlib import Path
import os, shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(os.environ.get('SQUAD_PREVIEW_DIR',str(ROOT/'previews')))
OUT.mkdir(parents=True,exist_ok=True)
# The managed browser blocks URL navigation. Render the local HTML directly.
# A Storage-compatible in-memory fixture supplies persistence in an opaque origin.
STORAGE="""() => { const data = new Map(); Object.defineProperty(window,'localStorage',{value:{getItem:k=>data.has(String(k))?data.get(String(k)):null,setItem:(k,v)=>data.set(String(k),String(v)),removeItem:k=>data.delete(String(k)),clear:()=>data.clear()}}); }"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True)
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate(STORAGE)
 page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='load')
 page.wait_for_timeout(1300)
 page.screenshot(path=str(OUT/'squad-code-network-preview.png'))
 print('errors',errors)
 print('nodes',page.locator('.map-node').count(),'roster',page.locator('.roster-item').count())
 print('title',page.title())
 browser.close()
