<template>
      <div></div>
</template>

<script>   
   
   import * as PIXI from 'https://cdn.skypack.dev/pixi.js@7.3.0-rc';

// Initialize Pixi.js
// const app = new PIXI.Application();
// document.body.appendChild(app.view);

// Load the image
// PIXI.Loader.shared.add('image', '/home/suxoza/picjam/picjam-private-tasks/public/images/picjam_-_green_turtleneck_sweater_47.png').load(() => {
//     const imageTexture = PIXI.Loader.shared.resources.image.texture;
//     const imageSprite = new PIXI.Sprite(imageTexture);
//     app.stage.addChild(imageSprite);

//     // Replace red color with blue
//     const replacementColor = 0x0000FF; // Blue color in hexadecimal
//     const tolerance = 50; // Adjust this value to control color matching tolerance

//     const imageData = app.renderer.plugins.extract.pixels(imageSprite);
//     for (let i = 0; i < imageData.length; i += 4) {
//         const r = imageData[i];
//         const g = imageData[i + 1];
//         const b = imageData[i + 2];

//         if (Math.abs(r - 255) <= tolerance && g <= tolerance && b <= tolerance) {
//             imageData[i] = (replacementColor >> 16) & 0xFF;
//             imageData[i + 1] = (replacementColor >> 8) & 0xFF;
//             imageData[i + 2] = replacementColor & 0xFF;
//         }
//     }

//     app.renderer.plugins.extract.pixels(imageSprite, imageData);

//     // Render the modified image
//     app.render();
// });
    
  </script>
  <style>
    .pcr-app.visible{
      width: 250px;
    }
  </style>
    

