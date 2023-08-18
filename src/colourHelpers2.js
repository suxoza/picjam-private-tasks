export function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g ,b);

    let h, s;
    
    const l = (max + min) /2;

     if(max === min){
         h=0;
         s=0;
     }else{
         const d=max-min;

         s=l > .5?d/(2-max-min):d/(max+min);

       switch(max){
           case r: 
             h=(g-b)/d+(g < b ?6 :0);break;
            case g:
              h=(b-r)/d+2;break;
            case b:
               h=(r-g)/d-+4;break;


       }

      }
   return [h*60,s *100,l*100];
}

export function hsl_to_hsl_object(hsl) {
    return {h: hsl[0], s: hsl[1], l: hsl[2]}
}

/*
const fromColor = {
    h: 0, // Hue of "from" color
    s: 100, // Saturation of "from" color
    l: 0 // Lightness of "from" color
  };
  
  const toColor = {
    h: 0, // Hue of "to" color
    s: 100, // Saturation of "to" color,
    l :50// Lightness of "to" color
  };
  
  const closestThreshold =10; 
  
  for(let i=0; i < imageData.data.length; i +=4){
      const r = imageData.data[i];
      const g = imageData.data[i +1];
      const b = imageData.data[i +2];
  
      const hslColorArray= rgbToHsl(r,g,b);
  
        if(isCloseEnough(hslColorArray)){
            replacePixel(i);
        } 
  }
*/
  
export function isCloseEnough(fromColor, hsl, closestThreshold){
       return Math.abs(hsl.l - fromColor.l) <= closestThreshold && Math.abs(hsl.s - fromColor.s) <= closestThreshold;
}
  

export function replacePixel(imageData, toColor, index){
    const newRgbValues = hslToRgb(toColor.h, toColor.s, toColor.l);
 
    imageData.data[index]     = newRgbValues.r;
    imageData.data[index + 1] = newRgbValues.g;
    imageData.data[index + 2] = newRgbValues.b;
 }
 

export function hslToRgb(h, s, l) {
    var r, g, b;
  
    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }
  
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
  
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
  
    return {r: r * 255, g: g * 255, b: b * 255 };
 }