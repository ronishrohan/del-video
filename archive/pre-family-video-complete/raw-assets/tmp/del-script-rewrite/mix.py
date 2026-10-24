from pathlib import Path
import subprocess,json,numpy as np
P=Path('/tmp/del-script-rewrite');SR=48000

def pcm(p,fx=None):
 c=['ffmpeg','-v','error','-i',str(p)]
 if fx:c+=['-af',fx]
 return np.frombuffer(subprocess.run(c+['-ar',str(SR),'-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout,dtype='<f4').astype(float)
def wav(p,x):
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','pipe:0','-c:a','pcm_s24le',str(p)],input=x.astype('<f4').tobytes(),check=True)
def stats(p):
 r=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-16:TP=-1.8:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 return json.JSONDecoder().raw_decode(r.stderr[r.stderr.rfind('{'):])[0]
# Approved worn-radio band and restrained saturation/compression; one very quiet short reflection.
fx='aresample=48000,highpass=f=300,highpass=f=300,lowpass=f=3800,lowpass=f=3800,equalizer=f=1300:t=q:w=0.7:g=3,equalizer=f=600:t=q:w=1:g=1,volume=5dB,asoftclip=type=tanh,volume=-5dB,acompressor=threshold=-22dB:ratio=3:attack=6:release=100:makeup=2dB,aecho=0.8:0.6:110:0.08'
x=pcm(P/'raw.mp3',fx)
# Insert only silence at verified paragraph boundaries. Every spoken sample stays at natural1x speed.
a=json.load(open(P/'asr/raw.json'));words=[w for s in a['segments'] for w in s['words']]
print('TRANSCRIPT',a['text'])
print('WORDS',len(words))
for i,w in enumerate(words):
 print(i,w['word'],w['start'],w['end'])
# Existing natural sentence gaps are extended, without trimming breaths or changing speech speed.
# Three paragraph beats and six small sentence rests support the sparse piano bed.
cuts=[(3.54,.6),(6.86,3.0),(10.87,.6),(12.81,.6),(15.50,.6),(18.70,3.0),(20.77,.6),(24.06,3.0),(25.50,.6)]
parts=[];last=0
for at,extra in cuts:
 at=round(at*SR);parts.extend([x[last:at],np.zeros(round(extra*SR))]);last=at
parts.append(x[last:]);v=np.concatenate(parts)
N=50*SR;voice=np.zeros(N);start=round(1.2*SR);voice[start:start+len(v)]=v
wav(P/'voice-treated.wav',voice)
vs=stats(P/'voice-treated.wav');voice*=10**((-18-float(vs['input_i']))/20)
music=pcm('/Users/ronish/.ao/data/worktrees/del-video/del-video-6/del-full/assets/audio/music.wav')
# Under speech: gain room plus a modest frequency carve. In pauses: untouched selected bed.
carved=pcm('/Users/ronish/.ao/data/worktrees/del-video/del-video-6/del-full/assets/audio/music.wav','equalizer=f=1600:t=q:w=0.8:g=-5,equalizer=f=700:t=q:w=1:g=-2')
hop=480;level=np.sqrt(np.mean(voice.reshape(-1,hop)**2,axis=1));on=level>.005
for i in range(1,len(on)-1):
 if on[i-1] and np.any(on[i:min(len(on),i+20)]):on[i]=True
env=[];g=0
for active in on:
 target=1.0 if active else 0.0;g+=(.45 if target>g else .025)*(target-g);env.append(g)
env=np.interp(np.arange(N),np.arange(len(env))*hop,env)
bed=music*(1-env)+carved*env*.38
premix=voice+bed;wav(P/'premix.wav',premix)
m=stats(P/'premix.wav');keys={'input_i':'measured_I','input_tp':'measured_TP','input_lra':'measured_LRA','input_thresh':'measured_thresh','target_offset':'offset'}
f='loudnorm=I=-16:TP=-1.8:LRA=9:'+':'.join(f'{v}={m[k]}' for k,v in keys.items())+':linear=true,aresample=48000'
out=Path('/Users/ronish/.ao/data/artifacts/del-video-6/script-rewrite/del-jessica-natural-preview.mp3')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(P/'premix.wav'),'-af',f,'-ar',str(SR),'-ac','1','-t','50','-c:a','libmp3lame','-b:a','256k','-write_xing','1',str(out)],check=True)
final=stats(out);decoded=pcm(out)
result={'output':str(out),'decoded_samples':len(decoded),'decoded_duration':len(decoded)/SR,'source_voice_duration':len(pcm(P/'raw.mp3'))/SR,'added_silence':sum(t for _,t in cuts),'voice_start':1.2,'speech_span_end':1.2+len(v)/SR,'voice_rate':1.0,'final':final}
P.joinpath('verification.json').write_text(json.dumps(result,indent=2));print('RESULT',json.dumps(result))
