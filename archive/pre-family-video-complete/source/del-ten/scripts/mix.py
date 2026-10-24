"""Offline-only edit: approved Jessica + approved circus bed + procedural click transients."""
from pathlib import Path
import numpy as np, wave, subprocess, json
root=Path(__file__).resolve().parents[1]; a=root/'assets/audio'; sr=48000
# Dry mechanical transients, all tied to actual visual events at integer frames.
events=[(0,'hit'),(14,'tick'),(50,'hit'),(90,'tick'),(189,'tick'),(257,'hit'),(315,'click'),(324,'click'),(333,'click'),(347,'tick'),(351,'tick'),(356,'tick'),(396,'tick'),(420,'hit'),(441,'tick'),(459,'tick'),(504,'tick'),(549,'hit'),(590,'end')]
x=np.zeros(sr*10)
for f,kind in events:
 dur=.15 if kind in ['hit','end'] else .028
 t=np.arange(int(sr*dur))/sr
 # No voice generation, no roar/crackle, no echo; a compact bandlimited key/button impact.
 if kind in ['hit','end']:
  y=(np.sin(2*np.pi*(150*t-220*t*t))*.55+np.sin(2*np.pi*730*t)*.18)*np.exp(-t*40)
  if kind=='end':y*=1.1
 else:y=(np.sin(2*np.pi*1350*t)+.3*np.sin(2*np.pi*2350*t))*np.exp(-t*180)*(.17 if kind=='click' else .075)
 n=round(f/60*sr);end=min(len(x),n+len(y));x[n:end]+=y[:end-n]
with wave.open(str(a/'events.wav'),'wb')as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
(a/'events.json').write_text(json.dumps([dict(frame=f,seconds=f/60,kind=k)for f,k in events],indent=2))
fx="[0:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=120,lowpass=f=6500,acompressor=threshold=0.12:ratio=3:attack=5:release=70,volume=1.5,asoftclip=type=tanh,volume=0.75,adelay=1500|1500[vo];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=140,lowpass=f=6500,volume='if(lt(t,1.5),0.32,if(lt(t,9.6),0.10,0.24))':eval=frame[mu];[2:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=110,lowpass=f=6000,volume=0.9[fx];[vo][mu][fx]amix=inputs=3:normalize=0,atrim=end=10,apad=whole_dur=10,afade=t=out:st=9.99:d=0.01[out]"
subprocess.run(['ffmpeg','-v','error','-y','-i',str(a/'vo.mp3'),'-i',str(a/'music.mp3'),'-i',str(a/'events.wav'),'-filter_complex',fx,'-map','[out]','-c:a','pcm_s24le',str(a/'premix.wav')],check=True)
p=subprocess.run(['ffmpeg','-hide_banner','-i',str(a/'premix.wav'),'-af','loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
m=json.JSONDecoder().raw_decode(p.stderr[p.stderr.rfind('{'):])[0];keys={'input_i':'measured_I','input_tp':'measured_TP','input_lra':'measured_LRA','input_thresh':'measured_thresh','target_offset':'offset'}
f='loudnorm=I=-14:TP=-1.5:LRA=9:'+':'.join(f'{v}={m[k]}'for k,v in keys.items())+':linear=true,aresample=48000'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(a/'premix.wav'),'-af',f,'-c:a','pcm_s24le','-t','10',str(a/'mix.wav')],check=True)
(a/'premix.wav').unlink()
print('Mixed exactly 10 seconds; no paid calls.')
