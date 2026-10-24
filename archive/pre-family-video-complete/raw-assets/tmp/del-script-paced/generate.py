import os,json,urllib.request,urllib.error,subprocess
from pathlib import Path
P=Path('/tmp/del-script-paced');KEY=os.environ['ELEVENLABS_API_KEY']
script="""I've usually got an agent working while I'm checking something in a shell. Then I need the session I was just looking at.

Del is a native terminal multiplexer that keeps that work in one window. I move between Claude and my shell. While the agent's busy, I queue the next message. If I need an older chat, Command K gets me back to it.

It's built in Rust with GPUI. I like having a native app for the place I spend most of my day.

I'll leave the agent running. I'm going to check that failing test."""
text="""[slowly][relaxed] I've usually got an agent working... while I'm checking something in a shell. Then I need the session... I was just looking at.

[slowly] Del is a native terminal multiplexer... that keeps that work in one window. I move between Claude and my shell. While the agent's busy... I queue the next message. If I need an older chat, Command K... gets me back to it.

[slowly] It's built in Rust with GPUI. I like having a native app... for the place I spend most of my day.

[slowly] I'll leave the agent running. I'm going to check... that failing test."""
P.joinpath('script.txt').write_text(script)
def account():
 with urllib.request.urlopen(urllib.request.Request('https://api.elevenlabs.io/v1/user/subscription',headers={'xi-api-key':KEY}),timeout=35) as f:d=json.load(f)
 return {k:d.get(k) for k in ['character_count','character_limit','tier']}
before=account();P.joinpath('before.json').write_text(json.dumps(before));print('BEFORE',before,flush=True)
assert before['character_count']-18621+len(text)<1000
assert before['character_count']-16623+len(text)<20000
req={'text':text,'model_id':'eleven_v4','language_code':'en','voice_settings':{'stability':.4,'similarity_boost':.75}}
P.joinpath('request.json').write_text(json.dumps(req,indent=2))
r=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/cgSgspJ2msm6clMCkdW9?output_format=mp3_44100_128',data=json.dumps(req).encode(),headers={'xi-api-key':KEY,'Content-Type':'application/json'},method='POST')
try:
 with urllib.request.urlopen(r,timeout=180) as f:
  raw=f.read();headers={k:v for k,v in f.headers.items() if k.lower() in ['character-cost','x-character-count']}
except urllib.error.HTTPError as e:print(e.code,e.read().decode()[:1000]);raise SystemExit(1)
P.joinpath('raw.mp3').write_bytes(raw);P.joinpath('headers.json').write_text(json.dumps(headers))
buf=subprocess.run(['ffmpeg','-v','error','-i',str(P/'raw.mp3'),'-ar','48000','-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout
duration=len(buf)/4/48000
result={'words':len(script.split()),'raw_duration':duration,'words_per_minute':len(script.split())*60/duration,'headers':headers,'meets_requested_duration':35<=duration<=42}
P.joinpath('raw-check.json').write_text(json.dumps(result,indent=2));print('RAW_CHECK',json.dumps(result),flush=True)
msg=f"Corrected Jessica raw take measured BEFORE MIX: {result['words']}words/{duration:.3f}s natural1x = {result['words_per_minute']:.1f}wpm. Requested35–42s gate: {'PASS' if result['meets_requested_duration'] else 'FAIL'}. Documented[slowly] + phrasepunctuation; numeric speed omitted. Headercost{headers.get('character-cost','pending')}. No stretching or local silence added. Starting wordcheck; " + ('will mix over existing50s score with atmost3s additionalrests.' if result['meets_requested_duration'] else 'will report issue; no further generation without authorization.')
subprocess.run(['ao','send','--session','del-video-1','--steer','--message',msg],check=True)
