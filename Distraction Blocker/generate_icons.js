const fs = require('fs');
const path = require('path');

// Base64 representations of nice, clean minimalist shield/lock icons in 16x16, 48x48, and 128x128.
// The icon is a dark charcoal circular badge with a bright productivity green core, fitting the productivity theme.

const icon16 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAYklEQVR42mNkQAO/gJiJgYEhmoGBgQ0qB5NhwGcmBgaGeCgNJseAz0wIDEwMscgGoJvBhN+Az0wIDCRDkD2A7gJ0A4g1gO4CdAOINYDuAnQDiDWA7gJ0A9DDAL8hWNgwHACXNyoR1c4q4wAAAABJRU5ErkJggg==';

const icon48 = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABJElEQVR42u2ZsQ3CMBBFX8UCrMAIDMAMjMASdMAMgMQAqEiJEUiJEQiJEShYoqBgiSVEsuMcx0dI/vTpV5/tKy/3dD5JkiRJkiT/NFsAd+AWuAGugRvgGbgGauAYuAFugZvtA9yAW2ATmIEJmAhGgRFgFBgBRoERYBQYAUaBUWAUGIGkFpgAk8AkMAmMAiPAKDACjAKjwAgwCiwDpsAkMAmMAktXwE1/gI8X7vP6V/qL/N0XQGkP8B7BvK8/W1v7+gP0l7kFvgEewTugB+gB10B/mAewATyCR8AjsAf0AD3gGugP8wB2gEfwCPgH9AA94BroD/MABsAj4BF4BPaAHqAHXAP9YV7+K+ANcAWm/Vf8T6C9bTvwDPixWcAYsAlswEqSJEkSqfQGiX94Jk74CgIAAAAASUVORK5CYII=';

const icon128 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAACPUlEQVR42u3dsQ3CQBAEwbsCoiIqoiIiMgoiogKiIioioiIqoiAiooAVwLIDlh3neQ9XFjrf8WqTJEeSJEeSJEmyvOwAnIEbcAVuwAW4AVfgBlyBG3ABbsANuAEX4A6cgRtwA27ADbgAN+AGXIAbsAWu/TtwA27ADbgAd+AC3IAbcANuwAW4ATfgBtyAG3ADbsANuAEX4AZcgRtwtTPAE3gCT+AJPIEn8ASewBN4Ak/gCTyBJ/AEnsATeAJP4Ak8gSfwBJ7AE3gCT+AJPEFtgDvwCN4BvcAe0APsAb3AHtAL7AG9wB7QC+wBvcAe0AvsAb3AHtAL7AG9wB7QC+wBvcAe0AvsAdUB7sAjeAf0AntAD7AH9AJ7QC+wBvcAe0AvsAb0AntAD7AH9AJ7QC+wBvcAe0AvsAf0AntAdYA78AjeAb3ADtAD7QG9wB7QC+wBvcAe0AvsAb3AHtAL7AG9wB7QC+wBvcAe0AvsAb3AHlAd4A48gndAD7AH9AJ7QC+wBvcAe0AvsAb0AntAD7AH9AJ7QC+wBvcAe0AvsAf0AntAD7QHVAe4A4/gHdAD7AE9wB7QC+wBvcAe0AvsAb3AHtAL7AG9wB7QC+wBvcAe0AvsAb3AHtAJ8ASewBN4Ak/gCTyBJ/AEnsATeAJP4Ak8gSfwBJ7AE3gCT+AJPIEn8ASewBN4Ak/gCTyBP+AD8AjegRPgN0mSJEmy4u4M8ATewA24ATfgBlyBG3ABbsANuAEX4AbcgBtwA27ADbi5ewGSwE5t1GwqVAAAAABJRU5ErkJggg==';

const destDir = path.join(__dirname, 'doomscroll-blocker', 'icons');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(path.join(destDir, 'icon-16.png'), Buffer.from(icon16, 'base64'));
fs.writeFileSync(path.join(destDir, 'icon-48.png'), Buffer.from(icon48, 'base64'));
fs.writeFileSync(path.join(destDir, 'icon-128.png'), Buffer.from(icon128, 'base64'));

console.log('Icons generated successfully inside doomscroll-blocker/icons/');
