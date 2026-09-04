/*
 * Innov8 Studios — client-side video-frame thumbnail extraction. Pure
 * browser API, no dependency: an off-screen <video> loads the signed
 * URL, seeks to ~10% of its duration, and the seeked frame is drawn to
 * a canvas and returned as a data URL. Used by FileTile.jsx as the
 * "representative frame" preview for video files.
 */
export function generateVideoThumbnail(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    function cleanup() {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      video.src = "";
    }

    function onLoadedMetadata() {
      video.currentTime = Math.min(1, (video.duration || 1) * 0.1);
    }

    function onSeeked() {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    }

    function onError() {
      cleanup();
      reject(new Error("Couldn't load that video for a preview."));
    }

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.src = url;
  });
}
