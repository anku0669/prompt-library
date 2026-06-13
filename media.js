"use strict";
/* ── Background video + music player ──
   Media sources come from window.MEDIA in config.js. */

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
  let ready = false;          // player available (after enter)
  let hoveringPlayer = false;

  // hint dot so visitors know to hover bottom-left
  const hint = document.createElement("div");
  hint.className = "player-hint";
  document.body.appendChild(hint);

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

  /* Enter splash: unlocks audio + arms the player */
  function start(){
    if(started) return; started = true;
    enter.classList.add("hide");
    setTimeout(()=> enter.style.display = "none", 650);
    if(video){ video.play().catch(()=>{}); }
    if(tracks.length){
      ready = true;
      hint.classList.add("show");
      audio.volume = parseFloat($("volume").value || "0.6");
      loadTrack(0, true);
      setTimeout(setPlayIcon, 200);
    }
  }
  if(enter) enter.addEventListener("click", start);

  /* Reveal player only near the bottom-left corner */
  function updatePeek(inZone){
    if(!ready) return;
    if(inZone || hoveringPlayer){ player.classList.add("peek"); hint.classList.remove("show"); }
    else { player.classList.remove("peek"); hint.classList.add("show"); }
  }
  document.addEventListener("mousemove", (e)=>{
    const inZone = e.clientX <= 250 && e.clientY >= (window.innerHeight - 180);
    updatePeek(inZone);
  });
  player.addEventListener("mouseenter", ()=>{ hoveringPlayer = true; updatePeek(true); });
  player.addEventListener("mouseleave", ()=>{ hoveringPlayer = false; updatePeek(false); });
  // touch devices: tap the hint dot to toggle the bar
  hint.style.pointerEvents = "auto";
  hint.addEventListener("click", ()=>{ if(ready) player.classList.toggle("peek"); });

  /* Controls */
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
