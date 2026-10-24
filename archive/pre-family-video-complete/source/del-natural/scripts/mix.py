"""Full50s offline mix: fourteen approved Jessica files at1x, original piano/sine score, local quiet action sounds."""
from pathlib import Path
import subprocess,json,numpy as np
P=Path(__file__).resolve().parents[1];A=P/'assets/audio';SR=48000;N=50*SR
TMP=Path('/tmp/del-full-mix');TMP.mkdir(exist_ok=True)
def pcm(p,fx=None):
 cmd=['ffmpeg','-v','error','-i',str(p)]
 if fx:cmd+=['-af',fx]
 return np.frombuffer(subprocess.run(cmd+['-ar',str(SR),'-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout,dtype='<f4').astype(float)
def wav(p,x):subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','pipe:0','-c:a','pcm_s24le',str(p)],input=x.astype('<f4').tobytes(),check=True)
def stats(p):
 r=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-15:TP=-1.7:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 return json.JSONDecoder().raw_decode(r.stderr[r.stderr.rfind('{'):])[0]
voice=np.zeros(N)
for c in json.load(open(A/'voice-cues.json')):
 x=pcm(A/'voice'/c['file']);start=round(c['start']*SR);end=min(N,start+len(x));voice[start:end]+=x[:end-start]
wav(TMP/'voice-stem.wav',voice)
# Exact selected audition color, a small speech-frequency carve, no hiss/echo/fast rhythmic additions.
fx='aresample=48000,aformat=channel_layouts=mono,highpass=f=180,lowpass=f=4600,equalizer=f=1300:t=q:w=0.9:g=1,volume=1.5dB,asoftclip=type=tanh,volume=-1.5dB,equalizer=f=1500:t=q:w=1:g=-2.5'
music=pcm('/tmp/del-full-music/piano-synth-50s-raw.mp3',fx)
music=np.pad(music[:N],(0,max(0,N-len(music))))[:N];music[-4800:]*=np.linspace(1,0,4800)
wav(TMP/'music-treated.wav',music);ms=stats(TMP/'music-treated.wav');music*=10**((-25-float(ms['input_i']))/20)
wav(A/'music.wav',music)
# Speech-controlled smooth gain: preserve narration, music returns only in genuine rests.
hop=480;v=np.sqrt(np.mean(voice.reshape(-1,hop)**2,axis=1));active=v>.008
# Keep the whole speech phrase ducked, rather than pumping between syllables.
for i in range(1,len(active)-1):
 if active[i-1]and np.any(active[i:min(len(active),i+18)]):active[i]=True
duck=np.empty(len(active));g=1.0
for i,on in enumerate(active):
 target=.36 if on else 1.0;coef=.35 if target<g else .045;g+=coef*(target-g);duck[i]=g
duck=np.interp(np.arange(N),np.arange(len(duck))*hop,duck)
# Frame-accurate gentle mechanical/keyboard details, thinned to avoid a busy pulse.
events=json.load(open('/tmp/del-full-events.json'))['events'];picture=json.load(open(P/'assets/picture-cues.json'));placements={}
def add(f,kind,gain):
 if 0<=f<3000 and(f not in placements or gain>placements[f]['gain']):placements[f]={'frame':f,'time':f/60,'kind':kind,'gain':gain}
lastkey=-999
for e in sorted(events,key=lambda x:x['frame']):
 f=e['frame'];vs=e['vars'];targets=' '.join(e['targets'])
 if 'pressed'in str(vs.get('className','')):add(f,'click',.045)
 elif ('tabs-'in targets or '-mterm'in targets or '-mchat'in targets)and'className'in vs:add(f,'tab',.015)
 elif 'a4-hw'in targets and 'on'in str(vs.get('className','')):add(f,'search',.018)
 elif f-lastkey>=14 and(('textContent'in vs and vs['textContent'])or(vs.get('display')=='inline'and targets)):
  if not any(k in targets for k in ['caret','-cur','-c1','-c2','-gc']):add(f,'key',.012);lastkey=f
for s in picture['shots']:
 if s['id']in['a1-s5','a2-cas','a3-rust','a4-jump','a5-end']:add(s['frame'],'felt',.02)
add(306,'aha',.032);add(1301,'felt',.024);add(1485,'felt',.024);add(2808,'resolve',.035)
sfx=np.zeros(N)
for f,e in placements.items():
 kind=e['kind'];dur=.14 if kind in ['aha','resolve','felt']else .035;t=np.arange(round(SR*dur))/SR
 if kind in ['aha','resolve','felt']:
  freq=330 if kind=='aha'else(220 if kind=='resolve'else 196);z=(np.sin(2*np.pi*freq*t)+.2*np.sin(2*np.pi*freq*2*t))*np.exp(-t*34);z[:96]*=np.linspace(0,1,96)
 elif kind=='search':z=(np.sin(2*np.pi*880*t)+.22*np.sin(2*np.pi*1320*t))*np.exp(-t*150)
 else:z=(np.sin(2*np.pi*1400*t)+.3*np.sin(2*np.pi*2300*t))*np.exp(-t*(210 if kind=='key'else 145));z[:32]*=np.linspace(0,1,32)
 n=round(f/60*SR);end=min(N,n+len(z));sfx[n:end]+=z[:end-n]*e['gain']
(A/'sfx-cues.json').write_text(json.dumps(sorted(placements.values(),key=lambda e:e['frame']),indent=2));wav(A/'actions.wav',sfx)
pre=voice+music*duck+sfx;pre[-480:]*=np.linspace(1,0,480);wav(TMP/'premix.wav',pre)
m=stats(TMP/'premix.wav');keys={'input_i':'measured_I','input_tp':'measured_TP','input_lra':'measured_LRA','input_thresh':'measured_thresh','target_offset':'offset'}
f='loudnorm=I=-15:TP=-1.7:LRA=9:'+':'.join(f'{v}={m[k]}'for k,v in keys.items())+':linear=true,aresample=48000'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(TMP/'premix.wav'),'-af',f,'-ar','48000','-ac','2','-c:a','pcm_s24le','-t','50',str(A/'master.wav')],check=True)
measured=stats(A/'master.wav');print('MASTER',json.dumps(measured));print('VOICE14 unchanged; actions',len(placements),'music I beforegain',ms['input_i']);(TMP/'verification.json').write_text(json.dumps({'master':measured,'actions':len(placements),'voices':14,'music_duck_db':round(20*np.log10(.36),2)},indent=2))
