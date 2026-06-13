"use strict";
/* ── Background video + music player ──
   Media sources come from window.MEDIA in config.js. Drop your own
   car video (.mp4) and song files (.mp3) into a /media folder in the
   repo, or paste direct URLs in config.js. Everything degrades safely
   if a file is missing. */

(function(){
  const M = window.MEDIA || {};
  const $ = (id)=>document.getElementById(id);

  const video  = $("bgVideo");
  const enter  = $("enter");
  const player = $("player");
  const audio  = $("audio");

  const tracks = Array.isArray(M.tracks) ? M.tracks : [];
  let idx = 0;
  let started = false;

  /* Background video */
  if(video && M.video){
    video.src = M.video;
    video.addEventListener("loadeddata", ()=> document.body.classList.add("has-video"));
    video.addEventListener("canplay", ()=> document.body.classList.add("has-video"));
    video.play().catch(()=>{});
  }

  function loadTrack(i, autoplay){
    if(!tracks.length) return;
    idx = (i + tracks.length) % tracks.length;
    const t = tracks[idx];
    $("nowPlaying").textContent = t.title || ("Track " + (idx+1));
    if(t.src){
      audio.src = t.src;
      if(autoplay) audio.play().catch(()=>{});
    }
  }

  function setPlayIcon(){
    $("playBtn").innerHTML = (audio.paused ? "&#9654;" : "&#10074;&#10074;");
  }

  function start(){
    if(started) return; started = true;
    enter.classList.add("hide");
    setTimeout(()=> enter.style.display = "none", 650);
    if(video){ video.play().catch(()=>{}); }
    if(tracks.length){
      player.classList.add("show");
      audio.volume = parseFloat($("volume").value || "0.6");
      loadTrack(0, true);
      setTimeout(setPlayIcon, 200);
    }
  }
  if(enter) enter.addEventListener("click", start);

  $("playBtn") && ($("playBtn").onclick = ()=>{
    if(!tracks.length) return;
    if(!audio.src) loadTrack(idx, true);
    else if(audio.paused) audio.play().catch(()=>{}); else audio.pause();
    setPlayIcon();
  });
  $("nextBtn") && ($("nextBtn").onclick = ()=> loadTrack(idx+1, true));
  $("prevBtn") && ($("prevBtn").onclick = ()=> loadTrack(idx-1, true));
  audio.addEventListener("ended", ()=> loadTrack(idx+1, true));
  audio.addEventListener("play",  setPlayIcon);
  audio.addEventListener("pause", setPlayIcon);

  audio.addEventListener("timeupdate", ()=>{
    if(audio.duration){
      $("trackFill").style.width = ((audio.currentTime/audio.duration)*100) + "%";
    }
  });
  $("trackBar") && ($("trackBar").onclick = (e)=>{
    if(!audio.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left)/r.width) * audio.duration;
  });

  $("volume") && ($("volume").oninput = (e)=>{ audio.volume = parseFloat(e.target.value); });

  if(tracks.length) $("nowPlaying").textContent = tracks[0].title || "Track 1";
})();
