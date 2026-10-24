import os,json,urllib.request,urllib.error,time
from pathlib import Path
p=Path('/tmp/del-script-rewrite')
key=os.environ['ELEVENLABS_API_KEY']
def account():
 r=urllib.request.Request('https://api.elevenlabs.io/v1/user/subscription',headers={'xi-api-key':key})
 with urllib.request.urlopen(r,timeout=40) as f:d=json.load(f)
 return {k:d.get(k) for k in ['tier','character_count','character_limit']}
s=p.joinpath('script-v2.txt').read_text().strip()
before=account();p.joinpath('account-before.json').write_text(json.dumps(before))
assert before['character_count']-16623+1000<=20000
assert len(s)+80<1000
request={'text':'[calm, conversational, unhurried] '+s,'model_id':'eleven_v4','language_code':'en','voice_settings':{'stability':0.5,'similarity_boost':0.75}}
p.joinpath('request.json').write_text(json.dumps(request,indent=2))
r=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/cgSgspJ2msm6clMCkdW9?output_format=mp3_44100_128',data=json.dumps(request).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
try:
 with urllib.request.urlopen(r,timeout=180) as f:
  raw=f.read();headers={k:v for k,v in f.headers.items() if k.lower() in ['character-cost','x-character-count','content-type']}
except urllib.error.HTTPError as e:
 print('HTTP',e.code,e.read().decode()[:1000]);raise SystemExit(1)
p.joinpath('raw.mp3').write_bytes(raw)
p.joinpath('headers.json').write_text(json.dumps(headers))
after=account();p.joinpath('account-after.json').write_text(json.dumps(after))
print(json.dumps({'bytes':len(raw),'before':before,'after':after,'incremental':after['character_count']-before['character_count'],'headers':headers}))
