export const _SHADERS = {
    _p: {
        vert: `attribute vec2 aVertexPosition;
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        varying vec2 eba1;	
        varying vec4 coord;	
        
        uniform vec4 inputSize;
        uniform vec4 outputFrame;
    
        vec4 filterVertexPosition( void ) {
            vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;
            return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
        }
    
        vec2 filterTextureCoord( void ) {
            return aVertexPosition * (outputFrame.zw * inputSize.zw);
        }
    
        void main(void) {
            gl_Position = filterVertexPosition();
            vTextureCoord = filterTextureCoord();
            coord = vec4(filterTextureCoord(), .0, .0);		
        }`,

        sharpen: `precision highp float;
        uniform sampler2D uSampler;
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform float sharpen;
        uniform vec2 imgSize;
        void main() {
            vec2 offset[4];
            vec2 step = 1.0 / imgSize;
            float step_w = step.x;
            float step_h = step.y;
            offset[0] = vec2(0.0, -step_h);
            offset[1] = vec2(-step_w, 0.0);
            offset[2] = vec2(step_w, 0.0);
            offset[3] = vec2(0.0, step_h);
            vec4 midColor = texture2D(uSampler, coord.xy);
            vec4 sum = midColor * 5.0;
            for (int i = 0; i < 4; i++) {
                vec4 color = texture2D(uSampler, coord.xy + offset[i]);
                sum += color * -1.0;
            }
            gl_FragColor = mix(midColor, sum, sharpen);
        }`,

        distortion: `varying vec2 vTextureCoord;
        uniform sampler2D texture;
        uniform sampler2D uSampler;	
        uniform float distortion_amount;
        uniform float fringing;
        uniform vec2 imgSize;
        varying vec4 coord;
        
        void main() {
            vec4 coords = coord;
            vec2 center = vec2(0.5);
            float fringe = fringing / 9.0;
            float f = 1.0;
            float zoom = 1.0;
            
            // index of refraction of each color channel, causing chromatic fringing
            
            vec3 eta = vec3(1.0+fringe*0.7, 1.0+fringe*0.4, 1.0);
            if(distortion_amount < 0.0) {
                float correction = sqrt(imgSize.x*imgSize.x+imgSize.y*imgSize.y)/(distortion_amount*-4.0);
                float nx = (coords.x - center.x) * imgSize.x;
                float ny = (coords.y - center.y) * imgSize.y;
                float d = sqrt(nx*nx+ny*ny);
                float r = d/correction;
                if(r != 0.0) {
                    f = atan(r)/r;
                }
                r = max(-0.5 * imgSize.x, -0.5 * imgSize.y) / correction;
                zoom = atan(r)/r;
            }
            else {
                float size = 0.75;
                // canvas coordsinates to get the center of rendered viewport
                
                float r2 = (coords.x-center.x) * (coords.x-center.x) + (coords.y-center.y) * (coords.y-center.y);
                r2 = r2 * size * size;
                
                // only compute the cubic distortion if necessary
                
                f = 1.0 + r2 * distortion_amount * 2.0;
                zoom = 1.0 + (0.5 * size * size) * distortion_amount * 2.0;
            }
            // get the right pixel for the current position
            vec2 rCoords = (f*eta.r)*(coords.xy-center)/zoom+center;
            vec2 gCoords = (f*eta.g)*(coords.xy-center)/zoom+center;
            vec2 bCoords = (f*eta.b)*(coords.xy-center)/zoom+center;
            vec3 inputDistort = vec3(0.0);
            inputDistort.r = texture2D(uSampler, rCoords).r;
            inputDistort.g = texture2D(uSampler, gCoords).g;
            inputDistort.b = texture2D(uSampler, bCoords).b;
            gl_FragColor = vec4(inputDistort.r, inputDistort.g, inputDistort.b, 1.0);
        }`,

        clarity: `precision highp float;
	
        uniform sampler2D uSampler;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform sampler2D blurTexture;
        uniform mat4 compositeMatrix;
        uniform float clarity;
        uniform float distortion_amount;
        uniform vec2 imgSize;
        
        vec2 distort(vec2 coord, float amount, vec2 size) {
            float f = 1.0;
            float zoom = 1.0;
            vec2 center = vec2(0.5);
            if(amount < 0.0) {
                float correction = sqrt(size.x*size.x+size.y*size.y)/(amount*-4.0);
                float nx = (coord.x - center.x) * size.x;
                float ny = (coord.y - center.y) * size.y;
                float d = sqrt(nx*nx+ny*ny);
                float r = d/correction;
                if(r != 0.0) {
                    f = atan(r)/r;
                }
                r = max(-0.5 * size.x, -0.5 * size.y) / correction;
                zoom = atan(r)/r;
            }
            else {
                float size = 0.75;
                float r2 = (coord.x-center.x) * (coord.x-center.x) + (coord.y-center.y) * (coord.y-center.y);
                r2 = r2 * size * size;
                f = 1.0 + r2 * amount * 2.0;
                zoom = 1.0 + (0.5 * size * size) * amount * 2.0;
            }
            return f * (coord - center) / zoom + center;
        }
        // Luminance and Saturation functions
        // Adapted from: http://wwwimages.adobe.com/www.adobe.com/content/dam/Adobe/en/devnet/pdf/pdfs/PDF32000_2008.pdf
    
        float Lum(vec3 c) {
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
        vec3 ClipColor(vec3 c) {
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            if (n < 0.0) c = max((c-l)*l / (l-n) + l, 0.0);
            if (x > 1.0) c = min((c-l) * (1.0-l) / (x-l) + l, 1.0);
            return c;
        }
        vec3 SetLum(vec3 c, float l) {
            c += l - Lum(c);
            return ClipColor(c);
        }
        float Sat(vec3 c) {
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            return x - n;
        }
        vec3 SetSat(vec3 c, float s) {
            float cmin = min(min(c.r, c.g), c.b);
            float cmax = max(max(c.r, c.g), c.b);
            vec3 res = vec3(0.0);
            if (cmax > cmin) {
                if (c.r == cmin && c.b == cmax) {
                    // R min G mid B max
                    res.r = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.r == cmin && c.g == cmax) {
                    // R min B mid G max
                    res.r = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
                else if (c.g == cmin && c.b == cmax) {
                    // G min R mid B max
                    res.g = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.g == cmin && c.r == cmax) {
                    // G min B mid R max
                    res.g = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else if (c.b == cmin && c.r == cmax) {
                    // B min G mid R max
                    res.b = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else {
                    // B min R mid G max
                    res.b = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
    
            }
            return res;
        }
        float BlendOverlayf(float base, float blend) {
            return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
        }
        vec3 BlendOverlay(vec3 base, vec3 blend) {
            return vec3(BlendOverlayf(base.r, blend.r), BlendOverlayf(base.g, blend.g), BlendOverlayf(base.b, blend.b));
        }
        float BlendVividLightf(float base, float blend) {
            float BlendColorBurnf = (((2.0 * blend) == 0.0) ? (2.0 * blend) : max((1.0 - ((1.0 - base) / (2.0 * blend))), 0.0));
            float BlendColorDodgef = (((2.0 * (blend - 0.5)) == 1.0) ? (2.0 * (blend - 0.5)) : min(base / (1.0 - (2.0 * (blend - 0.5))), 1.0));
            return ((blend < 0.5) ? BlendColorBurnf : BlendColorDodgef);
        }
        vec3 BlendVividLight(vec3 base, vec3 blend) {
            return vec3(BlendVividLightf(base.r, blend.r), BlendVividLightf(base.g, blend.g), BlendVividLightf(base.b, blend.b));
        }
        void main() {
            

    
            vec4 col = texture2D(uSampler, coord.xy);
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix + 0.5;
            vec3 color = col.rgb;
            vec3 overlay = texture2D(blurTexture, distort(compositeCoords.xy, distortion_amount, imgSize)).rgb;
            float intensity = (clarity < 0.0) ? clarity / 2.0 : clarity * 2.0;
            intensity *= col.a;
            float lum = Lum(color);
            vec3 base = vec3(lum);
            vec3 mask = vec3(1.0 - pow(lum, 1.8));
            // invert blurred texture
            
            vec3 layer = vec3(1.0 - Lum(overlay));
            vec3 detail = clamp(BlendVividLight(base, layer), 0.0, 1.0);
            // we get negative detail by inverting the detail layer
            
            vec3 inverse = mix(1.0 - detail, detail, (intensity+1.0)/2.0);
            vec3 blend = BlendOverlay(color, mix(vec3(0.5), inverse, mask));
            gl_FragColor = vec4(SetLum(SetSat(color, Sat(blend)), Lum(blend)), col.a);
        }`     ,
        
        whites_blacks: `precision highp float;
        uniform sampler2D uSampler;
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform float whites;
        uniform float blacks;
    
        // Luminance and Saturation functions
    
        // Adapted from: http://wwwimages.adobe.com/www.adobe.com/content/dam/Adobe/en/devnet/pdf/pdfs/PDF32000_2008.pdf
    
        float Lum(vec3 c) {
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
        vec3 ClipColor(vec3 c) {
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            if (n < 0.0) c = max((c-l)*l / (l-n) + l, 0.0);
            if (x > 1.0) c = min((c-l) * (1.0-l) / (x-l) + l, 1.0);
            return c;
        }
        vec3 SetLum(vec3 c, float l) {
            c += l - Lum(c);
            return ClipColor(c);
        }
        float Sat(vec3 c) {
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            return x - n;
        }
        vec3 SetSat(vec3 c, float s) {
            float cmin = min(min(c.r, c.g), c.b);
            float cmax = max(max(c.r, c.g), c.b);
            vec3 res = vec3(0.0);
            if (cmax > cmin) {
                if (c.r == cmin && c.b == cmax) {
                    // R min G mid B max
                    res.r = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.r == cmin && c.g == cmax) {
                    // R min B mid G max
                    res.r = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
                else if (c.g == cmin && c.b == cmax) {
                    // G min R mid B max
                    res.g = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.g == cmin && c.r == cmax) {
                    // G min B mid R max
                    res.g = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else if (c.b == cmin && c.r == cmax) {
                    // B min G mid R max
                    res.b = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else {
                    // B min R mid G max
                    res.b = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
    
            }
            return res;
        }
        const float wb = 5.336778471840789E-03;
        const float wc = 6.664243592410049E-01;
        const float wd = 3.023761372137289E+00;
        const float we = -6.994413182098681E+00;
        const float wf = 3.293987131616894E+00;
        const float wb2 = -1.881032803339283E-01;
        const float wc2 = 2.812945435181010E+00;
        const float wd2 = -1.495096839176419E+01;
        const float we2 = 3.349416467551858E+01;
        const float wf2 = -3.433024909629221E+01;
        const float wg2 = 1.314308200442166E+01;
        const float bb = 8.376727344831676E-01;
        const float bc = -3.418495999327269E+00;
        const float bd = 8.078054837335609E+00;
        const float be = -1.209938703324099E+01;
        const float bf = 9.520315785756406E+00;
        const float bg = -2.919340722745241E+00;
        const float ba2 = 5.088652898054800E-01;
        const float bb2 = -9.767371127415029E+00;
        const float bc2 = 4.910705739925203E+01;
        const float bd2 = -1.212150899746360E+02;
        const float be2 = 1.606205314047741E+02;
        const float bf2 = -1.085660871669277E+02;
        const float bg2 = 2.931582214601388E+01;
        void main() {
            vec3 base = texture2D(uSampler, coord.xy).rgb;
            float maxx = max(base.r, max(base.g, base.b));
            float minx = min(base.r, min(base.g, base.b));
            float lum = (maxx+minx)/2.0;
            float x = lum;
            float x2 = x*x;
            float x3 = x2*x;
            float lum_pos, lum_neg;
            vec3 res;
            
            // whites
            
            lum_pos = wb*x + wc*x2+ wd*x3 + we*x2*x2 + wf*x2*x3;
            lum_pos = min(lum_pos, 1.0-lum);
            lum_neg = wb2*x + wc2*x2+ wd2*x3 + we2*x2*x2 + wf2*x2*x3 + wg2*x3*x3;
            lum_neg = max(lum_neg, -lum);
            res = whites >= 0.0 ? base*(lum_pos*whites+lum)/lum : base * (lum-lum_neg*whites)/lum;
            res = clamp(res, 0.0, 1.0);
            
            // blacks
            
            lum_pos = bb*x + bc*x2+ bd*x3 + be*x2*x2 + bf*x2*x3 + bg*x3*x3;
            lum_pos = min(lum_pos, 1.0-lum);
            lum_neg = lum <= 0.23 ? -lum : ba2 + bb2*x + bc2*x2+ bd2*x3 + be2*x2*x2 + bf2*x2*x3 + bg2*x3*x3;
            lum_neg = max(lum_neg, -lum);
            res = blacks >= 0.0 ? res*(lum_pos*blacks+lum)/lum : res * (lum-lum_neg*blacks)/lum;
            res = clamp(res, 0.0, 1.0);
            gl_FragColor = vec4(SetLum(base, Lum(res)), 1.0);
        }`,

        shadows_highlights: `precision highp float;
        uniform sampler2D uSampler;	
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform sampler2D blurTexture;
        uniform mat4 compositeMatrix;
        uniform float shadows;
        uniform float highlights;
        uniform float distortion_amount;
    
        uniform vec2 imgSize;
        uniform float textureFlag;
        vec2 distort(vec2 coord, float amount, vec2 size) {
            float f = 1.0;
            float zoom = 1.0;
            vec2 center = vec2(0.5);
            if(amount < 0.0) {
                float correction = sqrt(size.x*size.x+size.y*size.y)/(amount*-4.0);
                float nx = (coord.x - center.x) * size.x;
                float ny = (coord.y - center.y) * size.y;
                float d = sqrt(nx*nx+ny*ny);
                float r = d/correction;
                if(r != 0.0) {
                    f = atan(r)/r;
                }
                r = max(-0.5 * size.x, -0.5 * size.y) / correction;
                zoom = atan(r)/r;
            }
            else {
                float size = 0.75;
                float r2 = (coord.x-center.x) * (coord.x-center.x) + (coord.y-center.y) * (coord.y-center.y);
                r2 = r2 * size * size;
                f = 1.0 + r2 * amount * 2.0;
                zoom = 1.0 + (0.5 * size * size) * amount * 2.0;
            }
            return f * (coord - center) / zoom + center;
        }
        // Luminance and Saturation functions
        // Adapted from: http://wwwimages.adobe.com/www.adobe.com/content/dam/Adobe/en/devnet/pdf/pdfs/PDF32000_2008.pdf
    
        float Lum(vec3 c) {
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
        vec3 ClipColor(vec3 c) {
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            if (n < 0.0) c = max((c-l)*l / (l-n) + l, 0.0);
            if (x > 1.0) c = min((c-l) * (1.0-l) / (x-l) + l, 1.0);
            return c;
        }
        vec3 SetLum(vec3 c, float l) {
            c += l - Lum(c);
            return ClipColor(c);
        }
        float Sat(vec3 c) {
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            return x - n;
        }
        vec3 SetSat(vec3 c, float s) {
            float cmin = min(min(c.r, c.g), c.b);
            float cmax = max(max(c.r, c.g), c.b);
            vec3 res = vec3(0.0);
            if (cmax > cmin) {
                if (c.r == cmin && c.b == cmax) {
                    // R min G mid B max
                    res.r = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.r == cmin && c.g == cmax) {
                    // R min B mid G max
                    res.r = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
                else if (c.g == cmin && c.b == cmax) {
                    // G min R mid B max
                    res.g = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.g == cmin && c.r == cmax) {
                    // G min B mid R max
                    res.g = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else if (c.b == cmin && c.r == cmax) {
                    // B min G mid R max
                    res.b = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else {
                    // B min R mid G max
                    res.b = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
    
            }
            return res;
        }
        void main() {
            //orig
            vec4 col = texture2D(uSampler, coord.xy);
            
            
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix + 0.5;
            vec3 base = col.rgb;
            vec3 color = texture2D(blurTexture, distort(compositeCoords.xy, distortion_amount, imgSize)).rgb;
            float amt = mix(highlights, shadows, 1.0 - Lum(color)) * col.a;
            if (amt < 0.0) amt *= 2.0;
            
            // exposure
            
            vec3 res = mix(base, vec3(1.0), amt);
            vec3 blend = mix(vec3(1.0), pow(base, vec3(1.0/0.7)), amt);
            res = max(1.0 - ((1.0 - res) / blend), 0.0);
            res = SetLum(SetSat(base, Sat(res)), Lum(res));
            gl_FragColor = vec4(res, col.a);
        }`,

        exposure: `precision highp float;
        uniform sampler2D uSampler;
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform float exposure;
        uniform float gamma;
    
        // Luminance and Saturation functions
    
        // Adapted from: http://wwwimages.adobe.com/www.adobe.com/content/dam/Adobe/en/devnet/pdf/pdfs/PDF32000_2008.pdf
    
        float Lum(vec3 c) {
            return 0.298839*c.r + 0.586811*c.g + 0.11435*c.b;
        }
        vec3 ClipColor(vec3 c) {
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            if (n < 0.0) c = max((c-l)*l / (l-n) + l, 0.0);
            if (x > 1.0) c = min((c-l) * (1.0-l) / (x-l) + l, 1.0);
            return c;
        }
        vec3 SetLum(vec3 c, float l) {
            c += l - Lum(c);
            return ClipColor(c);
        }
        float Sat(vec3 c) {
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            return x - n;
        }
        vec3 SetSat(vec3 c, float s) {
            float cmin = min(min(c.r, c.g), c.b);
            float cmax = max(max(c.r, c.g), c.b);
            vec3 res = vec3(0.0);
            if (cmax > cmin) {
                if (c.r == cmin && c.b == cmax) {
                    // R min G mid B max
                    res.r = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.r == cmin && c.g == cmax) {
                    // R min B mid G max
                    res.r = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
                else if (c.g == cmin && c.b == cmax) {
                    // G min R mid B max
                    res.g = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.g == cmin && c.r == cmax) {
                    // G min B mid R max
                    res.g = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else if (c.b == cmin && c.r == cmax) {
                    // B min G mid R max
                    res.b = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else {
                    // B min R mid G max
                    res.b = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
    
            }
            return res;
        }
        mat3 sRGB2XYZ = mat3(
        0.4360747, 0.3850649, 0.1430804, 0.2225045, 0.7168786, 0.0606169, 0.0139322, 0.0971045, 0.7141733
        );
        mat3 XYZ2sRGB = mat3(
        3.1338561, -1.6168667, -0.4906146, -0.9787684, 1.9161415, 0.0334540, 0.0719453, -0.2289914, 1.4052427
        );
        mat3 ROMM2XYZ = mat3(
        0.7976749, 0.1351917, 0.0313534, 0.2880402, 0.7118741, 0.0000857, 0.0000000, 0.0000000, 0.8252100
        );
        mat3 XYZ2ROMM = mat3(
        1.3459433, -0.2556075, -0.0511118, -0.5445989, 1.5081673, 0.0205351, 0.0000000, 0.0000000, 1.2118128
        );
        float ramp(float t) {
            t *= 2.0;
            if (t >= 1.0) {
                t -= 1.0;
                t = log(0.5) / log(0.5*(1.0-t) + 0.9332*t);
            }
            return clamp(t, 0.001, 10.0);
        }
        void main() {
            vec4 col = texture2D(uSampler, coord.xy);
            vec3 base = col.rgb;
            vec3 res, blend;
            
            // base = base * sRGB2XYZ * XYZ2ROMM;
            
            
            float amt = mix(0.009, 0.98, exposure);
            if (amt < 0.0) {
                res = mix(vec3(0.0), base, amt + 1.0);
                blend = mix(base, vec3(0.0), amt + 1.0);
                res = min(res / (1.0 - blend*0.9), 1.0);
            }
            else {
                res = mix(base, vec3(1.0), amt);
                blend = mix(vec3(1.0), pow(base, vec3(1.0/0.7)), amt);
                res = max(1.0 - ((1.0 - res) / blend), 0.0);
            }
            res = pow(SetLum(SetSat(base, Sat(res)), Lum(res)), vec3(ramp(1.0 - (gamma + 1.0) / 2.0)));
            
            // res = res * ROMM2XYZ * XYZ2sRGB;
            
            
            gl_FragColor = vec4(mix(base, res, col.a), col.a);
        }`,

        temperature: `precision highp float;
        uniform sampler2D uSampler;	
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform float temperature;
        uniform float tint;
        mat3 matRGBtoXYZ = mat3(
        0.4124564390896922, 0.21267285140562253, 0.0193338955823293, 0.357576077643909, 0.715152155287818, 0.11919202588130297, 0.18043748326639894, 0.07217499330655958, 0.9503040785363679
        );
        mat3 matXYZtoRGB = mat3(
        3.2404541621141045, -0.9692660305051868, 0.055643430959114726, -1.5371385127977166, 1.8760108454466942, -0.2040259135167538, -0.498531409556016, 0.041556017530349834, 1.0572251882231791
        );
        mat3 matAdapt = mat3(
        0.8951, -0.7502, 0.0389, 0.2664, 1.7135, -0.0685, -0.1614, 0.0367, 1.0296
        );
        mat3 matAdaptInv = mat3(
        0.9869929054667123, 0.43230526972339456, -0.008528664575177328, -0.14705425642099013, 0.5183602715367776, 0.04004282165408487, 0.15996265166373125, 0.0492912282128556, 0.9684866957875502
        );
        vec3 refWhite, refWhiteRGB;
        vec3 d, s;
        vec3 RGBtoXYZ(vec3 rgb) {
            vec3 xyz, XYZ;
            xyz = matRGBtoXYZ * rgb;
            
            // adaption
            
            XYZ = matAdapt * xyz;
            XYZ *= d/s;
            xyz = matAdaptInv * XYZ;
            return xyz;
        }
        vec3 XYZtoRGB(vec3 xyz) {
            vec3 rgb, RGB;
            
            // adaption
            
            RGB = matAdapt * xyz;
            rgb *= s/d;
            xyz = matAdaptInv * RGB;
            rgb = matXYZtoRGB * xyz;
            return rgb;
        }
        float Lum(vec3 c) {
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
        vec3 ClipColor(vec3 c) {
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            if (n < 0.0) c = (c-l)*l / (l-n) + l;
            if (x > 1.0) c = (c-l) * (1.0-l) / (x-l) + l;
            return c;
        }
        vec3 SetLum(vec3 c, float l) {
            float d = l - Lum(c);
            c.r = c.r + d;
            c.g = c.g + d;
            c.b = c.b + d;
            return ClipColor(c);
        }
        // illuminants
        //vec3 A = vec3(1.09850, 1.0, 0.35585);
        vec3 D50 = vec3(0.96422, 1.0, 0.82521);
        vec3 D65 = vec3(0.95047, 1.0, 1.08883);
        //vec3 D75 = vec3(0.94972, 1.0, 1.22638);
    
    
    
        //vec3 D50 = vec3(0.981443, 1.0, 0.863177);
        //vec3 D65 = vec3(0.968774, 1.0, 1.121774);
    
        vec3 CCT2K = vec3(1.274335, 1.0, 0.145233);
        vec3 CCT4K = vec3(1.009802, 1.0, 0.644496);
        vec3 CCT20K = vec3(0.995451, 1.0, 1.886109);
        void main() {
            vec4 col = texture2D(uSampler, coord.xy);
            vec3 to, from;
            if (temperature < 0.0) {
                to = CCT20K;
                from = D65;
            }
            else {
                to = CCT4K;
                from = D65;
            }
            vec3 base = col.rgb;
            float lum = Lum(base);
            // mask by luminance
            
            float temp = abs(temperature) * (1.0 - pow(lum, 2.72));
            
            // from
            
            refWhiteRGB = from;
            // to
            
            refWhite = vec3(mix(from.x, to.x, temp), mix(1.0, 0.9, tint), mix(from.z, to.z, temp));
            
            // mix based on alpha for local adjustments
            
            refWhite = mix(refWhiteRGB, refWhite, col.a);
            d = matAdapt * refWhite;
            s = matAdapt * refWhiteRGB;
            vec3 xyz = RGBtoXYZ(base);
            vec3 rgb = XYZtoRGB(xyz);
            // brightness compensation
            
            vec3 res = rgb * (1.0 + (temp + tint) / 10.0);
            // preserve luminance
            
            //vec3 res = SetLum(rgb, lum);
            
            gl_FragColor = vec4(mix(base, res, col.a), col.a);
        }`,

        contrast: `precision highp float;
        uniform sampler2D uSampler;		
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform float contrast;
        float BlendOverlayf(float base, float blend) {
            return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
        }
        vec3 BlendOverlay(vec3 base, vec3 blend) {
            return vec3(BlendOverlayf(base.r, blend.r), BlendOverlayf(base.g, blend.g), BlendOverlayf(base.b, blend.b));
        }
        mat3 sRGB2XYZ = mat3(
        0.4360747, 0.3850649, 0.1430804, 0.2225045, 0.7168786, 0.0606169, 0.0139322, 0.0971045, 0.7141733
        );
        mat3 XYZ2sRGB = mat3(
        3.1338561, -1.6168667, -0.4906146, -0.9787684, 1.9161415, 0.0334540, 0.0719453, -0.2289914, 1.4052427
        );
        mat3 ROMM2XYZ = mat3(
        0.7976749, 0.1351917, 0.0313534, 0.2880402, 0.7118741, 0.0000857, 0.0000000, 0.0000000, 0.8252100
        );
        mat3 XYZ2ROMM = mat3(
        1.3459433, -0.2556075, -0.0511118, -0.5445989, 1.5081673, 0.0205351, 0.0000000, 0.0000000, 1.2118128
        );
        void main() {
            vec4 col = texture2D(uSampler, coord.xy);
            float amount = (contrast < 0.0) ? contrast/2.0 : contrast;
            vec3 base = col.rgb * sRGB2XYZ * XYZ2ROMM;
            vec3 overlay = mix(vec3(0.5), base, amount * col.a);
            vec3 res = BlendOverlay(base, overlay) * ROMM2XYZ * XYZ2sRGB;
            gl_FragColor = vec4(res, col.a);
        }`,


        diffuse: `varying vec4 coord;
        uniform sampler2D uSampler;
        uniform sampler2D blurTexture;
        uniform mat4 compositeMatrix;
    
        uniform float diffuse;
        uniform float distortion_amount;
        uniform vec2 imgSize;
    
        vec2 distort(vec2 coord, float amount, vec2 size) {
        float f = 1.0;
        float zoom = 1.0;
        vec2 center = vec2(0.5);
        if(amount < 0.0){
            float correction = sqrt(size.x*size.x+size.y*size.y)/(amount*-4.0);
            float nx = (coord.x - center.x) * size.x;
            float ny = (coord.y - center.y) * size.y;
            float d = sqrt(nx*nx+ny*ny);
            float r = d/correction;
            if(r != 0.0){
                f = atan(r)/r;
            }
            r = max(-0.5 * size.x, -0.5 * size.y) / correction;
            zoom = atan(r)/r;
    
        }else{
            float size = 0.75;
            float r2 = (coord.x-center.x) * (coord.x-center.x) + (coord.y-center.y) * (coord.y-center.y);
            r2 = r2 * size * size;
            f = 1.0 + r2 * amount * 2.0;
            zoom = 1.0 + (0.5 * size * size) * amount * 2.0;
        }
        return f * (coord - center) / zoom + center;
        }
    
        float Lum(vec3 c){
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
    
        void main() {
        vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix + 0.5;
        vec3 col = texture2D(uSampler, coord.xy).rgb;
        vec3 blur = texture2D(blurTexture, distort(compositeCoords.xy, distortion_amount, imgSize)).rgb;
    
        vec3 diffuseMap = blur / 2.0 + 0.5;
        float mask = 1.0 - pow(Lum(col), 2.72);
        vec3 blend = mix(vec3(0.5), diffuseMap, diffuse * 2.0 * mask);
        vec3 res = sqrt(col) * (2.0 * blend - 1.0) + 2.0 * col * (1.0 - blend);
    
        gl_FragColor = vec4(res, 1.0);
        }`,

        saturation_vibrance: `precision highp float;
        uniform sampler2D uSampler;			
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform float saturation;
        uniform float vibrance;
        void main() {
            vec4 col = texture2D(uSampler, coord.xy);
            vec3 color = col.rgb;
            float luminance = color.r*0.299 + color.g*0.587 + color.b*0.114;
            float mn = min(min(color.r, color.g), color.b);
            float mx = max(max(color.r, color.g), color.b);
            float sat = (1.0-(mx - mn)) * (1.0-mx) * luminance * 5.0;
            vec3 lightness = vec3((mn + mx)/2.0);
            
            // vibrance
            
            color = mix(color, mix(color, lightness, -vibrance), sat);
            
            // negative vibrance
            
            color = mix(color, lightness, (1.0-lightness)*(1.0-vibrance)/2.0*abs(vibrance));
            
            // saturation
            
            color = mix(color, vec3(luminance), -saturation);
            gl_FragColor = vec4(mix(col.rgb, color, col.a), col.a);
        }`,
        
        curves: `varying vec4 coord;
        uniform sampler2D uSampler;
        uniform sampler2D texture;
        uniform sampler2D map;
    
        void main() {
    
          vec4 color = texture2D(uSampler, coord.xy);
          color.r = texture2D(map, vec2(texture2D(map, vec2(color.r)).r)).a;
          color.g = texture2D(map, vec2(texture2D(map, vec2(color.g)).g)).a;
          color.b = texture2D(map, vec2(texture2D(map, vec2(color.b)).b)).a;
    
          gl_FragColor = color;
          
        }`,

        dehaze_map_1: `varying vec4 coord;
        uniform sampler2D uSampler;
    
        float random(vec3 scale, float seed) {
            /* use the fragment position for a different seed per-pixel */
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
        }
    
        const float filter_window=0.01;
        float minimumFilter(sampler2D tex, vec2 uv, vec3 ratio)
        {
            mediump float wsize = filter_window/14.0;
            vec3 res = vec3(1000.0,1000.0,1000.0);
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
            float offset2 = random(vec3(78.233, 151.7182, 12.9898), 0.0);
            for (float i = -7.0; i <= 7.0; i++) {
                for (float j= -7.0; j<= 7.0; j++) {
                    vec2 coord_sample=uv+vec2(float(i)+offset-0.5,float(j)+offset2-0.5)*wsize;
                    vec3 tmp=texture2D(tex,coord_sample).rgb;
                    tmp*=ratio;
                    res = min(res,tmp);
                }
            }
            return min(min(res[0],res[1]),res[2]);
        }
    
        void main() {
            vec3 base = texture2D(uSampler, coord.xy).rgb;
            float res_t = 1.0-0.95*minimumFilter(uSampler,coord.xy,vec3(1.0,1.0,1.0));
            res_t = max(1e-3,min(1.0-1e-3,res_t));
            gl_FragColor = vec4(base,res_t);
        }`,

        dehaze_map_2: `varying vec4 coord;
        uniform sampler2D uSampler;
    
        float random(vec3 scale, float seed) {
            /* use the fragment position for a different seed per-pixel */
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
        }
    
        const float sigma_s=0.02;
        const float sigma_c=0.2;
        const float filter_window=0.1;
        /* guid filter alpha channel with rgb information*/
        float guidedFilter(vec2 uv)
        {
            float wsize = filter_window/14.0;
            float res_v = 0.0;
            float res_w = 0.0;
            vec3 center_g=texture2D(uSampler,uv).rgb;
            float sigma_i=0.5*wsize*wsize/sigma_s/sigma_s;
            float offset2 = random(vec3(12.9898, 78.233, 151.7182), 0.0);
            float offset = random(vec3(151.7182, 12.9898, 78.233), 0.0);
            for (float i = -7.0; i <= 7.0; i++) {
                for (float j= -7.0; j<= 7.0; j++) {
                    vec2 coord_sample=uv+vec2(float(i)+offset-0.5,float(j)+offset2-0.5)*wsize;           
                    float tmp_v=texture2D(uSampler,coord_sample).a;   
                    vec3 tmp_g=texture2D(uSampler,coord_sample).rgb;   
                    vec3 diff_g=(tmp_g-center_g);
                    float tmp_w=exp(-(i*i+j*j)*sigma_i);
                    tmp_w*=exp(-(dot(diff_g,diff_g)/2.0/sigma_c/sigma_c));
                    res_v+=tmp_v*tmp_w;
                    res_w+=tmp_w;   
                }
            }
            float res = res_v/res_w;
            return res;
        }
    
        void main() {
            float res_t = guidedFilter(coord.xy);
            res_t = max(1e-3, min(1.0-1e-3, res_t));
            gl_FragColor = vec4(res_t,res_t,res_t,res_t);
        }`,

        dehaze: `varying vec4 coord;
        uniform sampler2D uSampler;
        uniform sampler2D map_t;
        
        uniform float dehaze; /*-1.0~1.0 */
        uniform vec3 average;
        
        uniform mat4 compositeMatrix;
        uniform float distortion_amount;
        uniform vec2 imgSize;
        
        float Lum(vec3 c){
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
        
        vec3 ClipColor(vec3 c){
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
        
            if (n < 0.0) c = max((c-l)*l / (l-n) + l, 0.0);
            if (x > 1.0) c = min((c-l) * (1.0-l) / (x-l) + l, 1.0);
        
            return c;
        }
        
        vec3 SetLum(vec3 c, float l){
            c += l - Lum(c);
        
            return ClipColor(c);
        }
        
        vec2 distort(vec2 coord, float amount, vec2 size) {
            float f = 1.0;
            float zoom = 1.0;
            vec2 center = vec2(0.5);
            if(amount < 0.0){
                float correction = sqrt(size.x*size.x+size.y*size.y)/(amount*-4.0);
                float nx = (coord.x - center.x) * size.x;
                float ny = (coord.y - center.y) * size.y;
                float d = sqrt(nx*nx+ny*ny);
                float r = d/correction;
                if(r != 0.0){
                    f = atan(r)/r;
                }
                r = max(-0.5 * size.x, -0.5 * size.y) / correction;
                zoom = atan(r)/r;
        
            }else{
                float size = 0.75;
                float r2 = (coord.x-center.x) * (coord.x-center.x) + (coord.y-center.y) * (coord.y-center.y);
                r2 = r2 * size * size;
                f = 1.0 + r2 * amount * 2.0;
                zoom = 1.0 + (0.5 * size * size) * amount * 2.0;
            }
            return f * (coord - center) / zoom + center;
        }
        
        
        const float mix_scale = 0.5;
        
        void main() {
            vec3 color_A = vec3(1.0);
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix + 0.5;
                /*rgb*/
            vec3 base = texture2D(uSampler,coord.xy).rgb;
            /*transmission*/
            float res_t = texture2D(map_t, distort(compositeCoords.xy, distortion_amount, imgSize)).a;
            /*correction*/
            color_A = mix(color_A, average, mix_scale);
            float dehaze_adjust = clamp(1.0/res_t,1.0,5.0)-1.0;
            dehaze_adjust = float(dehaze_adjust<1.0)*dehaze_adjust+float(dehaze_adjust>=1.0)*pow(dehaze_adjust,0.2);
            dehaze_adjust = dehaze_adjust+1.0;
            vec3 J = clamp(((base-color_A)*dehaze_adjust+color_A),0.0,1.0);
        
        
            //dehaze (-1,1)->d(0,1)
            float d = 1.0 - dehaze;
            float mixv = pow(res_t,d);
            vec3 result = mix(color_A,J,mixv);
            
            // vec3 res_lum = SetLum(base, Lum(result));
            // result = mix(result, res_lum, 0.5);
        
            /*mix*/
            //vec3 res_out=mix(base,result,0.5);
                gl_FragColor = vec4(result,1.0);
        }`,

        grain: `precision highp float;
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D uSampler;
        uniform vec2 imgSize;
        uniform float scale;
        uniform float grain_amount;
        uniform float grain_size;
        uniform mat4 compositeMatrix;
        const float timer = 1.0;
        const float intensity = 0.5;
        const float permTexUnit = 1.0/256.0;    // Perm texture texel-size
    
        const float permTexUnitHalf = 0.5/256.0;  // Half perm texture texel-size
    
    
        //a random texture generator, but you can also use a pre-computed perturbation texture
        vec4 rnm(in vec2 tc) {
            float noise = sin(dot(tc + vec2(timer, timer), vec2(12.9898, 78.233))) * 43758.5453;
            float noiseR = fract(noise)*2.0-1.0;
            float noiseG = fract(noise*1.2154)*2.0-1.0;
            float noiseB = fract(noise*1.3453)*2.0-1.0;
            float noiseA = fract(noise*1.3647)*2.0-1.0;
            return vec4(noiseR, noiseG, noiseB, noiseA);
        }
        float fade(in float t) {
            return t*t*t*(t*(t*6.0-15.0)+10.0);
        }
        float pnoise3D(in vec3 p) {
            vec3 pi = permTexUnit*floor(p)+permTexUnitHalf;
            // and offset 1/2 texel to sample texel centers
            
            vec3 pf = fract(p);     // Fractional part for interpolation
            
            // Noise contributions from (x = 0, y = 0), z = 0 and z = 1
            float perm00 = rnm(pi.xy).a;
            vec3  grad000 = rnm(vec2(perm00, pi.z)).rgb * 4.0 - 1.0;
            float n000 = dot(grad000, pf);
            vec3  grad001 = rnm(vec2(perm00, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
            float n001 = dot(grad001, pf - vec3(0.0, 0.0, 1.0));
            // Noise contributions from (x = 0, y = 1), z = 0 and z = 1
            
            float perm01 = rnm(pi.xy + vec2(0.0, permTexUnit)).a;
            vec3  grad010 = rnm(vec2(perm01, pi.z)).rgb * 4.0 - 1.0;
            float n010 = dot(grad010, pf - vec3(0.0, 1.0, 0.0));
            vec3  grad011 = rnm(vec2(perm01, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
            float n011 = dot(grad011, pf - vec3(0.0, 1.0, 1.0));
            // Noise contributions from (x = 1, y = 0), z = 0 and z = 1
            
            float perm10 = rnm(pi.xy + vec2(permTexUnit, 0.0)).a;
            vec3  grad100 = rnm(vec2(perm10, pi.z)).rgb * 4.0 - 1.0;
            float n100 = dot(grad100, pf - vec3(1.0, 0.0, 0.0));
            vec3  grad101 = rnm(vec2(perm10, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
            float n101 = dot(grad101, pf - vec3(1.0, 0.0, 1.0));
            // Noise contributions from (x = 1, y = 1), z = 0 and z = 1
            
            float perm11 = rnm(pi.xy + vec2(permTexUnit, permTexUnit)).a;
            vec3  grad110 = rnm(vec2(perm11, pi.z)).rgb * 4.0 - 1.0;
            float n110 = dot(grad110, pf - vec3(1.0, 1.0, 0.0));
            vec3  grad111 = rnm(vec2(perm11, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
            float n111 = dot(grad111, pf - vec3(1.0, 1.0, 1.0));
            // Blend contributions along x
            
            vec4 n_x = mix(vec4(n000, n001, n010, n011), vec4(n100, n101, n110, n111), fade(pf.x));
            // Blend contributions along y
            
            vec2 n_xy = mix(n_x.xy, n_x.zw, fade(pf.y));
            // Blend contributions along z
            
            float n_xyz = mix(n_xy.x, n_xy.y, fade(pf.z));
            return n_xyz;
        }
        //2d coordinate orientation thing
        vec2 coordRot(in vec2 tc, in float angle) {
            float aspect = imgSize.x/imgSize.y;
            float rotX = ((tc.x*2.0-1.0)*aspect*cos(angle)) - ((tc.y*2.0-1.0)*sin(angle));
            float rotY = ((tc.y*2.0-1.0)*cos(angle)) + ((tc.x*2.0-1.0)*aspect*sin(angle));
            rotX = ((rotX/aspect)*0.5+0.5);
            rotY = rotY*0.5+0.5;
            return vec2(rotX, rotY);
        }
        void main() {
            float size = (grain_size + 1.5) * scale; //grain particle size (1.5 - 2.5)
            
            float grain = grain_amount / 4.0;
            float width = imgSize.x;
            float height = imgSize.y;
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix + 0.5;
            vec3 rotOffset = vec3(1.425, 3.892, 5.835); //rotation offset values
            
            vec2 rotCoordsR = coordRot(compositeCoords.xy, timer + rotOffset.x);
            vec3 noise = vec3(pnoise3D(vec3(rotCoordsR*vec2(width/size, height/size), 0.0)));
            vec3 col = texture2D(uSampler, coord.xy).rgb;
            //noisiness response curve based on scene luminance
            
            vec3 lumcoeff = vec3(0.299, 0.587, 0.114);
            float luminance = mix(0.0, dot(col, lumcoeff), intensity);
            float lum = smoothstep(0.2, 0.0, luminance);
            lum += luminance;
            noise = mix(noise, vec3(0.0), pow(lum, 4.0));
            col = col+noise*grain;
            gl_FragColor = vec4(col, 1.0);
        }`,

        hsl_fragm: `varying vec4 coord;
        uniform sampler2D uSampler;
        uniform sampler2D map;
    
        vec3 RGBToHSL(vec3 color)
        {
        vec3 hsl; // init to 0 to avoid warnings ? (and reverse if + remove first part)
        
        float fmin = min(min(color.r, color.g), color.b);    //Min. value of RGB
        float fmax = max(max(color.r, color.g), color.b);    //Max. value of RGB
        float delta = fmax - fmin;             //Delta RGB value
    
        hsl.z = (fmax + fmin) / 2.0; // Luminance
    
        if (delta == 0.0)   //This is a gray, no chroma...
        {
            hsl.x = 0.0;  // Hue
            hsl.y = 0.0;  // Saturation
        }
        else                                    //Chromatic data...
        {
            if (hsl.z < 0.5)
            hsl.y = delta / (fmax + fmin); // Saturation
            else
            hsl.y = delta / (2.0 - fmax - fmin); // Saturation
            
            float deltaR = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;
            float deltaG = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;
            float deltaB = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;
    
            if (color.r == fmax )
            hsl.x = deltaB - deltaG; // Hue
            else if (color.g == fmax)
            hsl.x = (1.0 / 3.0) + deltaR - deltaB; // Hue
            else if (color.b == fmax)
            hsl.x = (2.0 / 3.0) + deltaG - deltaR; // Hue
    
            if (hsl.x < 0.0)
            hsl.x += 1.0; // Hue
            else if (hsl.x > 1.0)
            hsl.x -= 1.0; // Hue
        }
    
        return clamp(hsl,0.0,1.0);
        }
    
        float HueToRGB(float f1, float f2, float hue)
        {
        if (hue < 0.0)
            hue += 1.0;
        else if (hue > 1.0)
            hue -= 1.0;
        float res;
        if ((6.0 * hue) < 1.0)
            res = f1 + (f2 - f1) * 6.0 * hue;
        else if ((2.0 * hue) < 1.0)
            res = f2;
        else if ((3.0 * hue) < 2.0)
            res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
        else
            res = f1;
        return res;
        }
    
        vec3 HSLToRGB(vec3 hsl)
        {
        vec3 rgb;
        
        if (hsl.y == 0.0)
            rgb = vec3(hsl.z); // Luminance
        else
        {
            float f2;
            
            if (hsl.z < 0.5)
            f2 = hsl.z * (1.0 + hsl.y);
            else
            f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);
            
            float f1 = 2.0 * hsl.z - f2;
            
            rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));
            rgb.g = HueToRGB(f1, f2, hsl.x);
            rgb.b = HueToRGB(f1, f2, hsl.x - (1.0/3.0));
        }
        
        return rgb;
        }
    
        float Lum(vec3 c){
        return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
    
        vec3 ClipColor(vec3 c){
        float l = Lum(c);
        float n = min(min(c.r, c.g), c.b);
        float x = max(max(c.r, c.g), c.b);
    
        if (n < 0.0) c = (c-l)*l / (l-n) + l;
        if (x > 1.0) c = (c-l) * (1.0-l) / (x-l) + l;
        
        return c;
        }
    
        vec3 SetLum(vec3 c, float l){
        float d = l - Lum(c);
    
        c.r = c.r + d;
        c.g = c.g + d;
        c.b = c.b + d;
        
        return ClipColor(c);
        }
    
        void main() {
    
        vec3 color = texture2D(uSampler, coord.xy).rgb;
        vec3 hsl = RGBToHSL(color);
        vec3 hslMap = texture2D(map, vec2(hsl.x)).xyz;
    
            vec3 rgb = HSLToRGB(vec3(
            hsl.x - ((1.0 - hslMap.x*2.0)*60.0)/360.0,
            hsl.y * (hslMap.y*2.0),
            hsl.z// + (hslMap.z - 0.5)*hsl.y*0.5
            ));
    
            float lum = Lum(color);
            rgb = SetLum(rgb, lum + (hslMap.z - 0.5) * (hsl.y*(1.0-lum)*4.0) * lum*lum);
    
        gl_FragColor = vec4(rgb, 1.0);
        
        }`,

        split_tone: `precision highp float;
        uniform sampler2D uSampler;	
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform vec3 shadows;
        uniform vec3 highlights;
        uniform float balance;
        mat3 matRGBtoXYZ = mat3(
        0.4124564390896922, 0.21267285140562253, 0.0193338955823293, 0.357576077643909, 0.715152155287818, 0.11919202588130297, 0.18043748326639894, 0.07217499330655958, 0.9503040785363679
        );
        mat3 matXYZtoRGB = mat3(
        3.2404541621141045, -0.9692660305051868, 0.055643430959114726, -1.5371385127977166, 1.8760108454466942, -0.2040259135167538, -0.498531409556016, 0.041556017530349834, 1.0572251882231791
        );
        mat3 matAdapt = mat3(
        0.8951, -0.7502, 0.0389, 0.2664, 1.7135, -0.0685, -0.1614, 0.0367, 1.0296
        );
        mat3 matAdaptInv = mat3(
        0.9869929054667123, 0.43230526972339456, -0.008528664575177328, -0.14705425642099013, 0.5183602715367776, 0.04004282165408487, 0.15996265166373125, 0.0492912282128556, 0.9684866957875502
        );
        vec3 refWhite, refWhiteRGB = vec3(1.0);
        vec3 d, s;
        vec3 RGBtoXYZ(vec3 rgb) {
            vec3 xyz, XYZ;
            xyz = matRGBtoXYZ * rgb;
            
            // adaption
            
            XYZ = matAdapt * xyz;
            XYZ *= d/s;
            xyz = matAdaptInv * XYZ;
            return xyz;
        }
        vec3 XYZtoRGB(vec3 xyz) {
            vec3 rgb, RGB;
            
            // adaption
            
            RGB = matAdapt * xyz;
            rgb *= s/d;
            xyz = matAdaptInv * RGB;
            rgb = matXYZtoRGB * xyz;
            return rgb;
        }
        float Lum(vec3 c) {
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
        vec3 ClipColor(vec3 c) {
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
            if (n < 0.0) c = (c-l)*l / (l-n) + l;
            if (x > 1.0) c = (c-l) * (1.0-l) / (x-l) + l;
            return c;
        }
        vec3 SetLum(vec3 c, float l) {
            float d = l - Lum(c);
            c.r = c.r + d;
            c.g = c.g + d;
            c.b = c.b + d;
            return ClipColor(c);
        }
        void main() {
            vec3 base = texture2D(uSampler, coord.xy).rgb;
            float lum = Lum(base);
            float mask = (1.0 - pow(lum, 2.72));
            vec3 illum = vec3(0.95047, 1.0, 1.08883); // D65
            
            
            refWhite = mix(illum * shadows * 2.0, illum * highlights * 2.0, clamp(lum + balance, 0.0, 1.0));
            refWhite = mix(illum, refWhite, mask);
            refWhiteRGB = vec3(illum.x, 1.0, illum.z);
            d = matAdapt * refWhite;
            s = matAdapt * refWhiteRGB;
            vec3 xyz = RGBtoXYZ(base);
            vec3 rgb = XYZtoRGB(xyz);
            vec3 res = rgb;//SetLum(rgb, lum);
            
            
            gl_FragColor = vec4(res, 1.0);
        }`,

        mask_radial: `precision highp float;
        uniform sampler2D uSampler;	
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform float feather;
        uniform float invert;
        uniform float angle;
        uniform vec2 position;
        uniform vec2 size;
        uniform mat4 compositeMatrix;
        uniform sampler2D texture;
        uniform vec2 imgSize;
        float random(vec3 scale, float seed) {
            /* use the fragment position for a different seed per-pixel */
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
        }
        void main() {
            float blur = min(1.0 - feather, 0.990);
            float rads = radians(angle);
            float s = sin(rads);
            float c = cos(rads);
            vec3 col = texture2D(uSampler, coord.xy).rgb;
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix;
            vec2 coords = (vec2(compositeCoords.x, compositeCoords.y) - position) * imgSize;
            coords = (vec2(
            coords.x * c - coords.y * s, coords.x * s + coords.y * c
            ) / imgSize + position) / size;
            vec2 offset = 1.0 + (1.0 - vec2(feather));
            float dist = distance(coords * offset, position / size * offset);
            dist += random(vec3(12.9898, 78.233, 151.7182), 1.0)/50.0 * (1.0 - blur);
            float mask = smoothstep(1.0, blur, dist);
            if (invert > 0.0) mask = 1.0 - mask;
            gl_FragColor = vec4(col, mask);
        }`,

        mask_gradient: `precision highp float;
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform vec2 startPoint;
        uniform vec2 endPoint;
        uniform vec2 imgSize;
        uniform mat4 compositeMatrix;
        uniform sampler2D texture;
        uniform sampler2D uSampler;
        void main() {
            vec3 col = texture2D(uSampler, coord.xy).rgb;
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix;
            vec2 coords = vec2(compositeCoords.x, compositeCoords.y) * imgSize;
            vec2 start = vec2(startPoint.x, startPoint.y) * imgSize;
            vec2 end = vec2(endPoint.x, endPoint.y) * imgSize;
            vec2 direction = end - start;
            direction /= sqrt(direction.x * direction.x + direction.y * direction.y);
            float scale = dot(direction, end-start);
            float value = dot(direction, coords-start)/scale;
            gl_FragColor = vec4(col, clamp(1.0-value, 0.0, 1.0));
        }`,

        mix: `precision highp float;
        uniform sampler2D uSampler;
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform sampler2D original;
        uniform float blend;
        uniform bool is_effect;
        uniform mat4 compositeMatrix;
        void main() {
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix + 0.5;
            vec4 orig = texture2D(original, compositeCoords.xy);
            vec4 col = mix(texture2D(uSampler, coord.xy), orig, blend);

            if(is_effect) {
                vec4 usamp = texture2D(uSampler, coord.xy);
                vec4 col = vec4(1.0,1.0,1.0, 1.0);
                col = mix(vec4(1.0)-(vec4(1.0)*usamp.a-usamp) , orig, blend);
            
                float alpha = orig.a;
                gl_FragColor = vec4(col.rgb, alpha);     
            } else {
                gl_FragColor = vec4(col.rgb, orig.a);
            }
        }`,

        composite: `uniform sampler2D uSampler;
        precision highp float;
        uniform mat3 LIGHTGLgl_NormalMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrix;
        uniform mat4 LIGHTGLgl_ProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrix;
        uniform mat4 LIGHTGLgl_ModelViewMatrixInverse;
        uniform mat4 LIGHTGLgl_ProjectionMatrixInverse;
        uniform mat4 LIGHTGLgl_ModelViewProjectionMatrixInverse;
        varying vec4 coord;
        uniform sampler2D texture;
        uniform vec3 background;
        uniform vec4 compositeCoords;
        uniform vec2 screenResolution;
        void main() {
            vec2 size = (compositeCoords.zw - compositeCoords.xy) / screenResolution;
            vec2 offset = compositeCoords.xy / screenResolution;
            vec2 texCoords = (coord.xy - offset) / size;
            vec4 col = texture2D(uSampler, coord.xy);
            gl_FragColor = vec4(col.rgb, 1.0);
    
        }`,

        vignette: `uniform sampler2D uSampler;

        varying vec4 coord;
    
        uniform sampler2D texture;
        uniform vec2 size;
        uniform vec2 position;
        uniform float spread;
        uniform float amount;
        uniform float highlights;
        /* new uniform */
        uniform float vignette_exposure;
        uniform float vignette_roundness;
        uniform float vignette_size;
        uniform vec2 imgSize;
        uniform vec4 crop;
        uniform mat4 compositeMatrix;
        uniform mat4 rotationMatrix;
    
        float Lum(vec3 c){
            return 0.299*c.r + 0.587*c.g + 0.114*c.b;
        }
    
        vec3 ClipColor(vec3 c){
            float l = Lum(c);
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
    
            if (n < 0.0) c = max((c-l)*l / (l-n) + l, 0.0);
            if (x > 1.0) c = min((c-l) * (1.0-l) / (x-l) + l, 1.0);
    
            return c;
        }
    
        vec3 SetLum(vec3 c, float l){
            c += l - Lum(c);
    
            return ClipColor(c);
        }
    
        float Sat(vec3 c){
            float n = min(min(c.r, c.g), c.b);
            float x = max(max(c.r, c.g), c.b);
    
            return x - n;
        }
    
        vec3 SetSat(vec3 c, float s){
            float cmin = min(min(c.r, c.g), c.b);
            float cmax = max(max(c.r, c.g), c.b);
    
            vec3 res = vec3(0.0);
    
            if (cmax > cmin) {
    
                if (c.r == cmin && c.b == cmax) { // R min G mid B max
                    res.r = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.r == cmin && c.g == cmax) { // R min B mid G max
                    res.r = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
                else if (c.g == cmin && c.b == cmax) { // G min R mid B max
                    res.g = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.b = s;
                }
                else if (c.g == cmin && c.r == cmax) { // G min B mid R max
                    res.g = 0.0;
                    res.b = ((c.b-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else if (c.b == cmin && c.r == cmax) { // B min G mid R max
                    res.b = 0.0;
                    res.g = ((c.g-cmin)*s) / (cmax-cmin);
                    res.r = s;
                }
                else { // B min R mid G max
                    res.b = 0.0;
                    res.r = ((c.r-cmin)*s) / (cmax-cmin);
                    res.g = s;
                }
    
            }
    
            return res;
        }
    
    
        float BlendSoftLightf(float base, float blend){
            return ((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)));
        }
    
        vec3 BlendSoftLight(vec3 base, vec3 blend){
            return vec3(BlendSoftLightf(base.r, blend.r), BlendSoftLightf(base.g, blend.g), BlendSoftLightf(base.b, blend.b));
        }
    
        float random(vec3 scale, float seed) {
            /* use the fragment position for a different seed per-pixel */
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
        }
    
        void main() {
            float blur = min(1.0 - spread, 0.990);
            float opacity = -amount;
            float opacity_center = - vignette_exposure * 0.5;
            /* base and crop */
            vec3 base = texture2D(uSampler, coord.xy).rgb;
            vec4 compositeCoords = (coord - 0.5 + compositeMatrix[3]) * compositeMatrix * rotationMatrix + 0.5;
              vec2 cropCoords = (compositeCoords.xy - vec2(crop.x, 1.0-crop.w-crop.y)) / crop.zw;
              /* scale size and limit normalized radius (midpoint in lightroom) */
            float scale_size = mix(10.0,2.0,vignette_size);
            float radius_normalized=1.0/scale_size;
            /* order for length computation when vignette_roundness<0, (-1->maximum norm for square, 0->2nd order) */
              float order_norm = 1.0/mix(0.5,0.05,max(0.0,-vignette_roundness));
              /* scale of x and y when vignette_roundness>0, 0-> elipse 1->perfect circle */
              vec2 iSize = imgSize * crop.zw;
              float scalex=mix(1.0,max(1.0,iSize.x/iSize.y),vignette_roundness);
              float scaley=mix(1.0,max(1.0,iSize.y/iSize.x),vignette_roundness);
              vec2 size_weight = vec2(scalex,scaley);
              /* highlight mask */
              vec3 mask = vec3(1.0 - pow(Lum(base), 2.72) * highlights);
            /* normalized distance to center */
            vec2 coords = (cropCoords - 0.5)/size*(1.0 - spread/2.0);
            vec2 dist = coords - position;
            /* scale x or y (longer one) when roundness>=0 */
            dist += dist*(size_weight-1.0)*float(vignette_roundness>=0.0);
            /* compute p norm for normalized distance */
            float dist_norm = pow(pow(abs(dist.x),order_norm)+pow(abs(dist.y),order_norm),1.0/order_norm);
            /* offset, can add some randomess */
            float offset = 1.0 + random(vec3(12.9898, 78.233, 151.7182), 0.0) / 100.0 * spread;
            /* center offset, smaller center */
            float offset_center = offset*1.0;
            /* res for outer */
            float weight = smoothstep(1.0, blur, dist_norm*scale_size*offset);
            vec3 res = vec3(weight);
            vec3 overlay = BlendSoftLight(base, mix(vec3(0.5), res/2.0, opacity));
            res = overlay * mix(vec3(1.0), res, opacity*mask);
            /* res for center */
            float weight_center = 1.0-weight;
            vec3 res_center = vec3(weight_center);
            vec3 overlay_center = BlendSoftLight(base, mix(vec3(0.5), res_center/2.0, opacity_center));	
            res_center = overlay_center * mix(vec3(1.0), res_center, opacity_center*mask);
            /*final mix result */
            float weight_mix = float(weight/(weight+weight_center));
            gl_FragColor = vec4(mix(res,res_center,weight_mix),1.0);
        }`,
    },
    round: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
         
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
         
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives:enable
    #endif
     
    precision mediump float;
    #define GLSLIFY 1
     
    uniform vec4 filterArea;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform vec2 dimensions;
    uniform vec2 spriteSize;
    uniform float useTexture;
    uniform float getCornerRadiusFromShortestSide;
     
    uniform float strokeWidth;
    uniform float cornerRadius;
    uniform vec4 strokeColor;
    uniform vec4 fillColor;
    uniform float quality;
    uniform float edgePaddingX;
    uniform float edgePaddingY;
    uniform float withoutPadding;
     
    float RoundRectangle(vec2 distFromCenter, vec2 halfSize, float radius)
    {
            float len = length(max(abs(distFromCenter) - (halfSize - radius), vec2(0.0))) - radius;
            float delta = 0.0;
            #ifdef GL_OES_standard_derivatives
              delta = fwidth(len)*quality;
            #else
              delta = 0.5 * quality;
            #endif
     
            float result = 1.0;
            if(radius==0.0) {
                result = step(min(halfSize.x,halfSize.y)/min(dimensions.x,dimensions.y),len);
            } else {
                result = smoothstep(-delta,+delta,len);
            }
            return result;
    }
     
    void main()
    {
          //  vec2 exPixels  = 1.0+(expandPixels*2.0/dimensions);
            vec2 pixelCoord = vTextureCoord  * filterArea.xy;
     
            //minus edgePadding from coords for edge bleeding, give space for interpolation
     
            pixelCoord -= vec2(edgePaddingX,edgePaddingY);
     
            // rectangle 1 stroke
            //minus edgePadding from size for edge bleeding, give space for interpolation
            vec2 size = vec2(dimensions.x,dimensions.y)-vec2((edgePaddingX*2.0), (edgePaddingY*2.0));
            vec2 halfSize = size; // / 2.0;
     
            if (withoutPadding == 1.0){
                halfSize = size;  /// 2.0;
            }
     
            vec2 rectCenter = size/2.0;
     
            float scaledCornerRadius = cornerRadius;
            if (spriteSize.x > 0.0 && spriteSize.y > 0.0){
                scaledCornerRadius =  scaledCornerRadius * min((dimensions.x / spriteSize.x), (dimensions.y / spriteSize.y));
            }
     
            if (getCornerRadiusFromShortestSide == 1.0){
                scaledCornerRadius = min(dimensions.x, dimensions.y) / 2.0;
            }
           
            float radius = max(min(min(size.x,size.y)/2.0,scaledCornerRadius),0.0);
            float genStroke = RoundRectangle(pixelCoord - rectCenter, halfSize, radius);
     
            // rectangle 2 fill
            vec2 fillSize = vec2(size.x-strokeWidth*2.0,size.y-strokeWidth*2.0);
            vec2 fillHalfSize = fillSize / 2.0;
            vec2 fillRectCenter = vec2(size/2.0);
            float fillRadius = max(radius-strokeWidth,0.0);
            float genFill = RoundRectangle(pixelCoord - fillRectCenter, fillHalfSize, fillRadius);
            vec4 _strokeColor = strokeColor;
            if(strokeWidth == 0.0) {
                _strokeColor = vec4(1.0);
            }
     
            vec4 result =  mix(_strokeColor, vec4(0.0), genStroke);
     
            if(useTexture == 0.0){
                result =  mix(fillColor, result, genFill);
            } else {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
                result =  mix(inputImage, result, genFill);
            }
           
            //result = mix(vec4(1.0,0.0,0.0,1.0),result,1.0 - genStroke);
            gl_FragColor = result;//texture2D(uSampler, vTextureCoord/exPixels);
    }`
    },
    vibrance: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        
        uniform sampler2D uSampler;
        uniform float amount;
        
        vec3 gammaCorrection(vec3 color, float gamma) {
            return pow(color, 1.0 / vec3(gamma));
        }
        
        vec3 levelsControlInputRange(vec3 color, float minInput, float maxInput) {
        
          return min(max(color - minInput, 0.0) / (maxInput - minInput+0.0001), 1.0);
        
        }
        
        vec3 levelsControlInput(vec3 color, float minInput, float gamma, float maxInput) {
            return gammaCorrection(levelsControlInputRange(color, minInput, maxInput), gamma);
        
        }
        
        vec3 levelsControlOutputRange(vec3 color, float minOutput, float maxOutput) {
            return mix(vec3(minOutput), vec3(maxOutput), color);
        
        }
        
        vec3 levelsControl(vec3 color, float minInput, float gamma, float maxInput, float minOutput, float maxOutput) {
            return levelsControlOutputRange(levelsControlInput(color, minInput, gamma, maxInput), minOutput, maxOutput);
        }
        
        vec3 rgb2hsv(vec3 c)
        {
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        vec3 hsv2rgb(vec3 c)
        {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }
        
        float overlayBlendF(float front, float back)
        {
            return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
        }
        
        void main(void)
        {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
        
                vec3 hsl = rgb2hsv(inputImage.rgb);
        
                float adjustVibrance = levelsControl(vec3(hsl.g),0.0,pow(amount+1.0,1.5),1.0,0.0,1.0).r;
                float adjustSat = overlayBlendF(hsl.g, mix(0.5, adjustVibrance, 1.0 - hsl.g));
        
                vec3 result = hsv2rgb(vec3(hsl.r,adjustSat,hsl.b));
        
                gl_FragColor = vec4(vec3(result),inputImage.a);
        }`
    },

    exposure: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void) {
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition.x,aVertexPosition.y,  1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float shadows;
        uniform float highlights;
        uniform float contrast;
        uniform float brightness;
        
        vec3 overlayBlend(vec3 front, vec3 back)
        {
            return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
        }
        
        float getLumo_1(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        float getLumo_0(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
         vec3 clipColor(vec3 c) {
             float l = getLumo_0(c);
             float n = min(min(c.r, c.g), c.b);
             float x = max(max(c.r, c.g), c.b);
        
             if (n < 0.0) {
                  max((c-l)*l / (l-n) + l, 0.0);
             }
             if (x > 1.0) {
                  min((c-l) * (1.0-l) / (x-l) + l, 1.0);
             }
        
             return c;
         }
        
        float getLumo_2(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        vec3 setlum(vec3 c, float l) {
             float d = l - getLumo_2(c);
             c = c + vec3(d);
             return clipColor(c);
        }
        
        float saturation(vec3 col){
            float colMin = min(min(col.r, col.g), col.b);
            float colMax = max(max(col.r, col.g), col.b);
        
            return colMax - colMin;
        }
        
        float mid(float colMin, float colMid, float colMax, float sat) {
             return ((colMid - colMin) * sat) / (colMax - colMin);
        }
        
        vec3 saturationBlend(vec3 col, float sat){
            float colMin = min(min(col.b, col.g), col.r);
            float colMax = max(max(col.b, col.g), col.r);
        
            vec3 outImage = vec3(0.0);
        
            if (colMin < colMax) {
        
                if (col.b == colMax && col.r == colMin) {
                    outImage.r = 0.0;
                    outImage.g = mid(colMin, col.g, colMax, sat);
                    outImage.b = sat;
                }
                else if (col.g == colMax && col.r == colMin) {
                    outImage.r = 0.0;
                    outImage.b = mid(colMin, col.b, colMax, sat);
                    outImage.g = sat;
                }
                else if (col.b == colMax && col.g == colMin) {
                    outImage.g = 0.0;
                    outImage.r = mid(colMin, col.r, colMax, sat);
                    outImage.b = sat;
                }
                else if (col.r == colMax && col.g == colMin) {
                    outImage.g = 0.0;
                    outImage.b = mid(colMin, col.b, colMax, sat);
                    outImage.r = sat;
                }
                else if (col.r == colMax && col.b == colMin) {
                    outImage.b = 0.0;
                    outImage.g = mid(colMin, col.g, colMax, sat);
                    outImage.r = sat;
                }
                else {
                    outImage.b = 0.0;
                    outImage.r = mid(colMin, col.r, colMax, sat);
                    outImage.g = sat;
                }
        
            }
        
            return outImage;
        }
        
        void main(void)
        {
        
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            vec4 bImage = texture2D(uSampler, vTextureCoord);
        
            float adjustedHigh = (highlights > 0.0) ? highlights : highlights*5.0;
            float adjustedShadow = (shadows<0.0) ? shadows * 5.0 : shadows*0.90;
        
            float mask = mix(adjustedHigh, adjustedShadow, 1.0 - getLumo_1(bImage.rgb));
        
            vec3 outImage = mix(inputImage.rgb, vec3(1.0), mask);
            vec3 orgMask = mix(vec3(1.0), pow(inputImage.rgb,vec3(1.25)), mask);
            outImage = max(1.0 - ((1.0 - outImage) / orgMask), 0.0);
        
            float adjustedBrightness = clamp(brightness+1.0,0.1,2.0);
        
            outImage = (adjustedBrightness<1.0) ? pow(outImage,vec3(1.0/sqrt(adjustedBrightness))) : pow(outImage,vec3(1.0/pow(adjustedBrightness,2.0)));
        
            vec3 contrastAm = mix(vec3(0.5), outImage, contrast);
            outImage = overlayBlend(contrastAm,outImage);
        
            outImage = setlum(saturationBlend(inputImage.rgb, saturation(outImage)), getLumo_1(outImage));
        
            gl_FragColor = vec4(outImage,inputImage.a);
        }`
    },

    color: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        
        uniform sampler2D uSampler;
        uniform float hue;
        uniform float saturation;
        uniform float temperature;
        const float pi = 3.14159265;
        
        void main(void)
        {
        
           vec4 color = texture2D(uSampler, vTextureCoord);
        
            if (color.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
            color.rgb /= color.a;
        
            float ang = (hue / 180.0) * pi;
            float s = sin(ang), c = cos(ang);
            vec3 weight = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;
            color.rgb = vec3(dot(color.rgb, weight.xyz), dot(color.rgb, weight.zxy), dot(color.rgb, weight.yzx));
        
            float avg = (color.r + color.g + color.b) / 3.0;
            if (saturation > 0.0) {
                color.rgb += (avg - color.rgb) * (1.0 - 1.0 / (1.001 - saturation/2.0));
            } else {
                color.rgb += (avg - color.rgb) * (-saturation);
            }
        
            color.r += temperature;
            color.b -= temperature;
        
            color.rgb *= color.a;
            gl_FragColor = color;
        
        }`
    },

    clarity: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        varying vec4 vColor;
        
        uniform sampler2D uSampler;
        
        uniform sampler2D blurImage;
        uniform float intensity;
        uniform float clampX;
        uniform float clampY;
        
        float overlayBlendF(float front, float back)
        {
            return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
        }
        
        float getLumo(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        vec3 xyz2lab( vec3 c ) {
            vec3 n = c / vec3( 95.047, 100, 108.883 );
            vec3 v;
            v.x = ( n.x > 0.008856 ) ? pow( n.x, 1.0 / 3.0 ) : ( 7.787 * n.x ) + ( 16.0 / 116.0 );
            v.y = ( n.y > 0.008856 ) ? pow( n.y, 1.0 / 3.0 ) : ( 7.787 * n.y ) + ( 16.0 / 116.0 );
            v.z = ( n.z > 0.008856 ) ? pow( n.z, 1.0 / 3.0 ) : ( 7.787 * n.z ) + ( 16.0 / 116.0 );
            return vec3(( 116.0 * v.y ) - 16.0, 500.0 * ( v.x - v.y ), 200.0 * ( v.y - v.z ));
        }
        
        vec3 rgb2xyz( vec3 c ) {
            vec3 tmp;
            tmp.x = ( c.r > 0.04045 ) ? pow( ( c.r + 0.055 ) / 1.055, 2.4 ) : c.r / 12.92;
            tmp.y = ( c.g > 0.04045 ) ? pow( ( c.g + 0.055 ) / 1.055, 2.4 ) : c.g / 12.92,
            tmp.z = ( c.b > 0.04045 ) ? pow( ( c.b + 0.055 ) / 1.055, 2.4 ) : c.b / 12.92;
            return 100.0 * tmp *
                mat3( 0.4124, 0.3576, 0.1805,
                      0.2126, 0.7152, 0.0722,
                      0.0193, 0.1192, 0.9505 );
        }
        
        vec3 rgb2lab(vec3 c) {
            vec3 lab = xyz2lab( rgb2xyz( c ) );
            return vec3( lab.x / 100.0, 0.5 + 0.5 * ( lab.y / 127.0 ), 0.5 + 0.5 * ( lab.z / 127.0 ));
        }
        
        vec3 lab2xyz( vec3 c ) {
            float fy = ( c.x + 16.0 ) / 116.0;
            float fx = c.y / 500.0 + fy;
            float fz = fy - c.z / 200.0;
            return vec3(
                 95.047 * (( fx > 0.206897 ) ? fx * fx * fx : ( fx - 16.0 / 116.0 ) / 7.787),
                100.000 * (( fy > 0.206897 ) ? fy * fy * fy : ( fy - 16.0 / 116.0 ) / 7.787),
                108.883 * (( fz > 0.206897 ) ? fz * fz * fz : ( fz - 16.0 / 116.0 ) / 7.787)
            );
        }
        
        vec3 xyz2rgb( vec3 c ) {
            vec3 v =  c / 100.0 * mat3(
                3.2406, -1.5372, -0.4986,
                -0.9689, 1.8758, 0.0415,
                0.0557, -0.2040, 1.0570
            );
            vec3 r;
            r.x = ( v.r > 0.0031308 ) ? (( 1.055 * pow( v.r, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.r;
            r.y = ( v.g > 0.0031308 ) ? (( 1.055 * pow( v.g, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.g;
            r.z = ( v.b > 0.0031308 ) ? (( 1.055 * pow( v.b, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.b;
            return r;
        }
        
        vec3 lab2rgb(vec3 c) {
            return xyz2rgb( lab2xyz( vec3(100.0 * c.x, 2.0 * 127.0 * (c.y - 0.5), 2.0 * 127.0 * (c.z - 0.5)) ) );
        }
        
        float vividBlendF(float front, float back)
        {
        
           return mix(max(0.0, 1.0 - min(1.0, (1.0 - back) / (2.0 * front))),
                  min(1.0, back / (2.0 * (1.0 - front))),
                  step(0.5, front));
        }
        
        float gammaAdjustF(float inpImage,float amount)
        {
            return pow(inpImage,amount);
        
        }
        
        void main(void)
        {
        
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            vec4 bImage = texture2D(blurImage, vTextureCoord * vec2(clampX,clampY));
        
            vec3 origLumo = rgb2lab(inputImage.rgb);
            vec3 blurLumo = rgb2lab(bImage.rgb);
        
            float mask = 1.0 - gammaAdjustF(origLumo.r,1.85);
        
            float details  = vividBlendF(1.0-blurLumo.r,origLumo.r);
        
            float maskDetails = mix(0.5, details, mask);
            float resultLumo = overlayBlendF(maskDetails,origLumo.r);
            vec3 result = lab2rgb(vec3(resultLumo,origLumo.g,origLumo.b));
        
            gl_FragColor = mix(inputImage, vec4(vec3(result),inputImage.a),intensity*1.2);
        }`
    },

    unsharpMask: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,
        fragment: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float intensity;

void main(void)
{
    // Sharpen detection matrix [0,1,0],[1,-4,1],[0,1,0]
    // Colors
    vec4 left = texture2D(uSampler, (vTextureCoord + vec2 (-1, 0)));
    vec4 center = texture2D(uSampler, vTextureCoord);
    vec4 right = texture2D(uSampler, (vTextureCoord + vec2 (1, 0)));
    vec4 down = texture2D(uSampler, (vTextureCoord + vec2 (0, -1)));
    
    gl_FragColor =  (1.0 + 4.0*intensity)*center - intensity*(left + right + down);
}`
    },
    vignette: {
        vertex: `attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        uniform mat3 otherMatrix;
        
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        
            vTextureCoord = aTextureCoord;
            vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 5.0)  ).xy;
        }`,
        fragment: `varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D mask;
        uniform float alpha;
        uniform float inverse;
        uniform vec4 maskClamp;
        uniform float alphaOnly;
        
        void main(void)
        {
            float clip = step(1.5,
                step(maskClamp.x, vMaskCoord.x) +
                step(maskClamp.y, vMaskCoord.y) +
                step(vMaskCoord.x, maskClamp.z) +
                step(vMaskCoord.y, maskClamp.w));
        
            vec4 original = texture2D(uSampler, vTextureCoord);
            vec4 originalCopy = original;   
            vec4 masky = texture2D(mask, vMaskCoord);
        
            original *= abs(inverse-(masky.r * masky.a * alpha * clip));
        
            if (alphaOnly == 1.0){
            	gl_FragColor = (originalCopy * masky.a);
            }else{
            	gl_FragColor = original;
            }
        }`
    },

    // MULTIPLY
    blendMode: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        attribute vec4 aColor;
        
        uniform mat3 projectionMatrix;
        uniform mat3 mapMatrix;
        
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
            vMapCoord = (mapMatrix * vec3(aVertexPosition, 1.0)).xy;
        }`,
        fragment: {
            1: `#define GLSLIFY 1
            varying vec2 vTextureCoord;
            varying vec2 vMapCoord;
            
            uniform sampler2D uSampler;
            uniform sampler2D iChannel1;
            uniform float intensity;
            uniform int alphadir;
            
            uniform float clampX;
            uniform float clampY;
            
            vec3 overlayBlend (vec3 front, vec3 back, float opacity, int alphadirection){
                return vec3((back.x <= 0.5) ? (2.0 * front.x * back.x) : (1.0 - 2.0 * (1.0 - back.x) * (1.0 - front.x)),
                            (back.y <= 0.5) ? (2.0 * front.y * back.y) : (1.0 - 2.0 * (1.0 - back.y) * (1.0 - front.y)),
                            (back.z <= 0.5) ? (2.0 * front.z * back.z) : (1.0 - 2.0 * (1.0 - back.z) * (1.0 - front.z))) * opacity + ((alphadirection == 0) ? back : front) * (1.0 - opacity);
            }
            
            void main(void){
            
                vec4 back = texture2D(uSampler, vTextureCoord);
                vec4 front = texture2D(iChannel1, vTextureCoord * vec2(clampX,clampY));
            
                if (front.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                 vec3 Cb = front.rgb/front.a;
                    vec3 Cs = vec3(0.0);
                if (back.a > 0.0) {
                    Cs = back.rgb / back.a;
                }
            
                vec3 colour = clamp(overlayBlend(Cb.xyz, Cs.xyz, intensity, alphadir), 0.0, 1.0);
            
                vec4 res;
                    res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                    res.a = front.a + back.a * (1.0-front.a);
                    gl_FragColor = vec4(res.xyz * res.a, res.a);
            
            }`
        }
    },
    blackWhite: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        PRESET_1: `#define GLSLIFY 1
        float bw_red_1540259130(vec3 c) {
        
             return float(c.r);
        }
        
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            gl_FragColor = vec4(vec3(bw_red_1540259130(inputImage.rgb)),inputImage.a);
        }`,

        PRESET_2: `#define GLSLIFY 1
        float bw_green_1540259130(vec3 c) {
        
            return float(c.g);
        }
        
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            gl_FragColor = vec4(vec3(bw_green_1540259130(inputImage.rgb)),inputImage.a);
        }`,

        PRESET_3: `#define GLSLIFY 1
        float bw_blue_1540259130(vec3 c) {
        
            return float(c.b);
        }
        
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            gl_FragColor = vec4(vec3(bw_blue_1540259130(inputImage.rgb)),inputImage.a);
        }`,

        PRESET_4: `#define GLSLIFY 1
        float getLumo(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            float result = getLumo(inputImage.rgb);
            gl_FragColor = vec4(vec3(result),inputImage.a);
        }`,

        PRESET_5: `#define GLSLIFY 1
        float getLumo(vec3 c) {

            return dot(c, vec3(0.299, 0.587, 0.114));
        }

        float sigmoidF(float inpImage,float brightness, float sharpness)
        {
            float calcSharpness = (2.0+(sharpness*20.0));
            return brightness / (1.0+exp(calcSharpness*(0.5-inpImage)));
        }

        float screenBlendF(float front, float back)
        {
            return 1.0 - (1.0 - front) * (1.0 - back);
        }

        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        uniform float brightness;

        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            float result = getLumo(inputImage.rgb);
            float sigmoidImage = sigmoidF(result, brightness, 0.59);
            result = screenBlendF(sigmoidImage,result);
            gl_FragColor = vec4(vec3(result),inputImage.a);
        }`,

        PRESET_6: `#define GLSLIFY 1
        float bw_red_1540259130(vec3 c) {
        
             return float(c.r);
        }
        
        float bw_green_1604150559(vec3 c) {
        
             return float(c.g);
        }
        
        float bw_blue_1117569599(vec3 c) {
        
             return float(c.b);
        }
        
        vec3 overlayBlend(vec3 front, vec3 back)
        {
            return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
        }
        
        float getLumo(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        varying vec2 vTextureCoord;
        
        uniform sampler2D uSampler;
        uniform vec3 color;
        uniform float mode;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
        
            gl_FragColor = vec4(overlayBlend(color, vec3((mode == 0.0)? bw_red_1540259130(inputImage.rgb) : ((mode == 1.0) ? getLumo(inputImage.rgb) : bw_blue_1117569599(inputImage.rgb)))),inputImage.a);
        }`,

        PRESET_8: `#define GLSLIFY 1
        float getLumo(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        float gammaAdjustF(float inpImage,float amount)
        {
            return pow(inpImage,amount);
        
        }
        
        vec3 vignette_0(vec3 inpImage, vec2 coord,float realWidth, float realHeight, float amount, float brightness)
        {
                vec2 position = coord  - vec2(0.5*realWidth,0.5*realHeight);
        
                // keep aspect ratio
                position.x *= realHeight / realWidth;
        
                //length from center
                float lengthCen = length(position);
        
                //clamping and adjusting for weird values
                float adjRadius = realHeight*(0.5+(1.0-amount)*0.5);//clamp(amount,0.0,1.00);
        
                //smoothstep for smooth results
               // float vignette = 1.0-clamp(smoothstep(0.0, amount, lengthCen),0.0,1.0);
                float vignette = clamp(smoothstep(adjRadius, adjRadius-0.2, lengthCen),0.0,1.0);
        
                //apply with multiply, could be other blend modes though.
                inpImage *= mix(vignette,1.0,brightness);
        
               return inpImage;
        
        }
        
        float overlayBlendF(float front, float back)
        {
            return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
        }
        
        float bwChannelMixer(vec3 c, vec3 values) {
        
             return dot(c, vec3(values.r, values.g, values.b));
        }
        
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        uniform float realWidth;
        uniform float realHeight;
        uniform float brightness;
        
        void main(void)
        {
           vec4 inputImage = texture2D(uSampler, vTextureCoord);
        
           // 0.8,0.22
           float mask = vignette_0(vec3(1.0),vTextureCoord, realWidth, realHeight, 0.8, brightness).r;
           float bwImage = bwChannelMixer(inputImage.rgb,vec3(0.25, 0.75, 0.0));
        
           float brightImage = gammaAdjustF(bwImage,0.60);
           float contrastAm = mix(0.5, brightImage, 0.5);//
           brightImage = overlayBlendF(contrastAm,brightImage);
        
           float darkImage = gammaAdjustF(bwImage,1.5);
           float result = mix(darkImage,brightImage,mask);//
           gl_FragColor = vec4(vec3(result),inputImage.a);//
        }`
    },

    hsFilter: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,
        fragment: `#define GLSLIFY 1
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        uniform float shadows;
        uniform float highlights;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            vec3 invert = 1.0-inputImage.rgb;
            float adjustedShadows = shadows/200.0;
            float adjustedHighlights = 1.0+highlights/200.0;
            inputImage.rgb = (inputImage.rgb-invert*adjustedShadows)*adjustedHighlights;
            gl_FragColor = inputImage;
        }`
    },

    adaptiveSharpness: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,
        fragment: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        varying vec4 vColor;
        
        uniform sampler2D uSampler;
        
        uniform sampler2D blurImage;
        uniform float intensity;
        uniform float clampX;
        uniform float clampY;
        
        void main(void)
        {
        
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            vec4 bImage = texture2D(blurImage, vTextureCoord * vec2(clampX,clampY));
        
            vec3 blurMinusOrig = clamp(inputImage.rgb-bImage.rgb,0.0,1.0);
            vec3 OrigMinusBlur = clamp(bImage.rgb-inputImage.rgb,0.0,1.0);
        
            vec3 details = clamp(inputImage.rgb-OrigMinusBlur+blurMinusOrig,0.0,1.0);
        
            gl_FragColor = vec4( mix(inputImage.rgb,details,intensity*2.0),inputImage.a);
        
        }`
    },

    popArt: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: {
            1: `#define GLSLIFY 1
            vec3 duotone(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec2 mapCoord( vec2 coord, vec4 filterA )
            {
                coord *= filterA.xy;
                coord += filterA.zw;
            
                return coord;
            }
            
            vec2 unmapCoord( vec2 coord, vec4 filterA )
            {
                coord -= filterA.zw;
                coord /= filterA.xy;
            
                return coord;
            }
            
            float getLumo_1(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            vec2 gridDot(vec2 px, float dSize)
            {
                return floor( px / dSize ) * dSize;
            }
            
            vec3 halftone(sampler2D inpSampler, vec2 coord, vec4 fArea, vec2 cXcY, float dotSize, vec3 dot_color, vec3 background_color)
            {
                vec2 uv = mapCoord(coord,fArea);
                vec2 onePixel = vec2(1.0/fArea.xy);
            
                //clamp edges
                vec2 clampEdges = vec2(1.0/cXcY.x-onePixel.x,1.0/cXcY.y-onePixel.y);
            
                //create dot grid
                vec2 pixelateGrid = gridDot(uv,dotSize) + 0.5*dotSize;
                float s = min(length(uv-pixelateGrid)/((dotSize)*0.5), 1.0);
            
                //create color grid
                pixelateGrid = unmapCoord(pixelateGrid,fArea);
                vec3 texc = texture2D(inpSampler, clamp(pixelateGrid,vec2(0.0),clampEdges)).rgb;
            
                //get inverse of lumo for dot sizing
                float lumoImage = 1.0-getLumo_1(texc);
            
                //calculate dot sizing and smoothness
                s = smoothstep(min(max(lumoImage,0.2),0.8),max(min(lumoImage+0.1,1.0),0.25),s);
            
                vec3 result = duotone(vec3(s),background_color,dot_color);
            
                return result;
            
            }
            
            vec3 overlayBlend(vec3 front, vec3 back)
            {
                return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
            }
            
            float getLumo_0(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            float getLumo_2(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            vec3 gradientMap(vec3 inpImage, sampler2D gradSampler, vec4 fArea, float clampXX, float yPosition) {
            
                float lumoImage = clamp(getLumo_2(inpImage),0.0,1.0);
                float pixelCoord = 255.0/fArea.x;
                return texture2D(gradSampler,vec2(lumoImage*pixelCoord*clampXX,yPosition)).rgb;
            
            }
            
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform sampler2D gradientSampler;
            uniform sampler2D adaptiveSharpenSampler;
            uniform float halftone_size;
            uniform vec4 filterArea;
            uniform float clampX;
            uniform float clampY;
            
            void main(void){
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
                vec4 gradientImage = texture2D(gradientSampler, vTextureCoord * vec2(clampX,clampY));
                vec4 asImage = texture2D(adaptiveSharpenSampler, vTextureCoord * vec2(clampX,clampY));
            
                vec3 halftoneImg = halftone(uSampler, vTextureCoord, filterArea, vec2(clampX, clampY), halftone_size, vec3(0.16),vec3(0.87));
                vec3 overlayImg = overlayBlend(halftoneImg, vec3(getLumo_0(asImage.rgb)));
                vec3 gradResult = gradientMap(overlayImg,gradientSampler,filterArea,clampX,0.0);
            
                gl_FragColor = vec4(gradResult, inputImage.a);
            }`,
            2: `#define GLSLIFY 1
            vec3 duotone_1(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec2 mapCoord( vec2 coord, vec4 filterA )
            {
                coord *= filterA.xy;
                coord += filterA.zw;
            
                return coord;
            }
            
            vec2 unmapCoord( vec2 coord, vec4 filterA )
            {
                coord -= filterA.zw;
                coord /= filterA.xy;
            
                return coord;
            }
            
            float getLumo_1(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            vec2 gridDot(vec2 px, float dSize)
            {
                return floor( px / dSize ) * dSize;
            }
            
            vec3 halftone(sampler2D inpSampler, vec2 coord, vec4 fArea, vec2 cXcY, float dotSize, vec3 dot_color, vec3 background_color)
            {
                vec2 uv = mapCoord(coord,fArea);
                vec2 onePixel = vec2(1.0/fArea.xy);
            
                //clamp edges
                vec2 clampEdges = vec2(1.0/cXcY.x-onePixel.x,1.0/cXcY.y-onePixel.y);
            
                //create dot grid
                vec2 pixelateGrid = gridDot(uv,dotSize) + 0.5*dotSize;
                float s = min(length(uv-pixelateGrid)/((dotSize)*0.5), 1.0);
            
                //create color grid
                pixelateGrid = unmapCoord(pixelateGrid,fArea);
                vec3 texc = texture2D(inpSampler, clamp(pixelateGrid,vec2(0.0),clampEdges)).rgb;
            
                //get inverse of lumo for dot sizing
                float lumoImage = 1.0-getLumo_1(texc);
            
                //calculate dot sizing and smoothness
                s = smoothstep(min(max(lumoImage,0.2),0.8),max(min(lumoImage+0.1,1.0),0.25),s);
            
                vec3 result = duotone_1(vec3(s),background_color,dot_color);
            
                return result;
            
            }
            
            vec3 overlayBlend(vec3 front, vec3 back)
            {
                return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
            }
            
            float getLumo_0(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            float getLumo_2(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            vec3 gradientMap(vec3 inpImage, sampler2D gradSampler, vec4 fArea, float clampXX, float yPosition) {
            
                float lumoImage = clamp(getLumo_2(inpImage),0.0,1.0);
                float pixelCoord = 255.0/fArea.x;
                return texture2D(gradSampler,vec2(lumoImage*pixelCoord*clampXX,yPosition)).rgb;
            
            }
            
            vec3 smoothThreshold(vec3 src,float blackThreshold,float whiteThreshold)
            {
            
                   float brightness = src.r*0.309+src.g*0.609+src.b*0.082;
                float threshold = clamp(brightness - blackThreshold,0.0,1.0)/clamp(abs(whiteThreshold - blackThreshold),0.0,1.0);
                return vec3(clamp(vec3(threshold),0.0,1.0));
            
            }
            
            float colorDodgeBlendF(float front, float back)
            {
                //return (((2.0 * (front - 0.5)) == 1.0) ? (2.0 * (front - 0.5)) : min(back / (1.0 - (2.0 * (front - 0.5))), 1.0));
                return back / (1.0 - front);
            }
            
            vec3 duotone_0(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform sampler2D textureSampler;
            uniform sampler2D gradientSampler;
            uniform sampler2D adaptiveSharpenSampler;
            uniform sampler2D blurSampler;
            uniform float clampX;
            uniform float clampY;
            uniform float halftone_size;
            uniform float detail_level;
            uniform vec4 filterArea;

            uniform float textureCenterX;
            uniform float textureCenterY;

            
            
            void main(void){
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
                vec4 textureImage = texture2D(textureSampler, vTextureCoord * vec2(textureCenterX,textureCenterY));
                vec4 asImage = texture2D(adaptiveSharpenSampler, vTextureCoord * vec2(clampX,clampY));
                vec4 blurImage = texture2D(blurSampler, vTextureCoord * vec2(clampX,clampY));
            
                vec3 halftoneImg = halftone(uSampler, vTextureCoord, filterArea, vec2(clampX, clampY), halftone_size, vec3(0.16),vec3(0.87));
                vec3 overlayImg = overlayBlend(halftoneImg, vec3(getLumo_0(asImage.rgb)));
                vec3 gradResult = gradientMap(overlayImg,gradientSampler,filterArea,clampX,0.0);
            
                // Sketch
                float inputDesat = getLumo_0(inputImage.rgb);
                float blurDesatInvert = clamp(1.0-getLumo_0(blurImage.rgb),0.0,1.0);
                float sketch = colorDodgeBlendF(blurDesatInvert,inputDesat);
                vec3 bringDetails = smoothThreshold(vec3(sketch),detail_level/255.0,1.0);
                bringDetails = duotone_0(bringDetails,vec3(1.0),vec3(0.42, 0.00, 0.00));
                bringDetails = clamp(bringDetails*textureImage.rgb,0.0,1.0);
                bringDetails = overlayBlend(gradResult,bringDetails);
            
                halftone_size;detail_level;
            
                gl_FragColor = vec4(bringDetails, inputImage.a);
            }`,
            3: ``,
            4: ``,
            5: `#define GLSLIFY 1
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform sampler2D blurSampler;
            
            uniform float red;
            uniform float navy;
            
            uniform float clampX;
            uniform float clampY;
            
            void main(void){
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
                vec4 blurImage = texture2D(blurSampler, vTextureCoord * vec2(clampX,clampY));
                red;navy;
            
                vec3 color1 = vec3(0.984,0.886,0.647);
                vec3 color2 = vec3(0.85,0.101,0.129);
                vec3 color3 = vec3(0.0,0.2,0.298);
                float whiteThreshold = 0.0;
                float whiteThreshold2 = 0.0;
            
                float brightness = (blurImage.r + blurImage.g + blurImage.b) / 3.0;
            
                vec3 dst = vec3(0.0);
            
                vec3 layer1 = vec3(0.0);
                float blackThreshold = red;
                float blackThreshold2 = navy;
            
                if (brightness < blackThreshold) {
                    layer1.r = color2.r;
                    layer1.g = color2.g;
                    layer1.b = color2.b;
                    dst = layer1;
                } else if (brightness > whiteThreshold) {
                    // Above threshold
                    layer1.r = color1.r;
                    layer1.g = color1.g;
                    layer1.b = color1.b;
                    dst = layer1;
                } else {
                    // Between the threshold
                    layer1.rgb = vec3((brightness - blackThreshold) / (whiteThreshold - blackThreshold));
                    dst = layer1;
                }
            
                vec3 layer2 = vec3(0.0);
                if (brightness < blackThreshold2) {
                    // Below threshold
                    layer2.r = color3.r;
                    layer2.g = color3.g;
                    layer2.b = color3.b;
                    dst=layer2;
                } else if (brightness > whiteThreshold2) {
                    // Above threshold
                    layer2.r = layer1.r;
                    layer2.g = layer1.g;
                    layer2.b = layer1.b;
                    dst=layer2;
                } else {
                    // Between the threshold
                    layer2.rgb = vec3((brightness - blackThreshold2) / (whiteThreshold2 - blackThreshold2));
                    dst=layer2;
                }
            
                gl_FragColor = vec4(dst.rgb, blurImage.a);
            }`,
            6: `#define GLSLIFY 1
            vec3 duotone(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec2 mapCoord( vec2 coord, vec4 filterA )
            {
                coord *= filterA.xy;
                coord += filterA.zw;
            
                return coord;
            }
            
            vec2 unmapCoord( vec2 coord, vec4 filterA )
            {
                coord -= filterA.zw;
                coord /= filterA.xy;
            
                return coord;
            }
            
            float getLumo_1(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            vec2 gridDot(vec2 px, float dSize)
            {
                return floor( px / dSize ) * dSize;
            }
            
            vec3 halftone(sampler2D inpSampler, vec2 coord, vec4 fArea, vec2 cXcY, float dotSize, vec3 dot_color, vec3 background_color)
            {
                vec2 uv = mapCoord(coord,fArea);
                vec2 onePixel = vec2(1.0/fArea.xy);
            
                //clamp edges
                vec2 clampEdges = vec2(1.0/cXcY.x-onePixel.x,1.0/cXcY.y-onePixel.y);
            
                //create dot grid
                vec2 pixelateGrid = gridDot(uv,dotSize) + 0.5*dotSize;
                float s = min(length(uv-pixelateGrid)/((dotSize)*0.5), 1.0);
            
                //create color grid
                pixelateGrid = unmapCoord(pixelateGrid,fArea);
                vec3 texc = texture2D(inpSampler, clamp(pixelateGrid,vec2(0.0),clampEdges)).rgb;
            
                //get inverse of lumo for dot sizing
                float lumoImage = 1.0-getLumo_1(texc);
            
                //calculate dot sizing and smoothness
                s = smoothstep(min(max(lumoImage,0.2),0.8),max(min(lumoImage+0.1,1.0),0.25),s);
            
                vec3 result = duotone(vec3(s),background_color,dot_color);
            
                return result;
            
            }
            
            vec3 overlayBlend(vec3 front, vec3 back)
            {
                return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
            }
            
            float hardLightBlendF(float front, float back)
            {
                return (front < 0.5) ? 2.0 * front * back : 1.0 - 2.0 * (1.0 - front) * (1.0 - back);
            }
            
            vec3 hardLightBlend(vec3 front,vec3 back)
            {
                vec3 result;
                result.r = hardLightBlendF(front.r,back.r);
                result.g = hardLightBlendF(front.g,back.g);
                result.b = hardLightBlendF(front.b,back.b);
                return result;
            }
            
            float getLumo_2(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            float getLumo_0(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            vec3 gradientMap(vec3 inpImage, sampler2D gradSampler, vec4 fArea, float clampXX, float yPosition) {
            
                float lumoImage = clamp(getLumo_0(inpImage),0.0,1.0);
                float pixelCoord = 255.0/fArea.x;
                return texture2D(gradSampler,vec2(lumoImage*pixelCoord*clampXX,yPosition)).rgb;
            
            }
            
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform sampler2D textureSampler;
            uniform sampler2D gradientSampler;
            uniform sampler2D adaptiveSharpenSampler;
            uniform float halftone_size;
            uniform vec4 filterArea;
            uniform float clampX;
            uniform float clampY;
            uniform float textureCenterX;
            uniform float textureCenterY;
            
            
            void main(void){
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
                vec4 textureImage = texture2D(textureSampler, vTextureCoord * vec2(textureCenterX,textureCenterY));
                vec4 asImage = texture2D(adaptiveSharpenSampler, vTextureCoord * vec2(clampX,clampY));
            
                vec3 halftoneImg = halftone(uSampler, vTextureCoord, filterArea, vec2(clampX, clampY), halftone_size, vec3(0.16),vec3(0.87));
                vec3 overlayImg = overlayBlend(halftoneImg, vec3(getLumo_2(asImage.rgb)));
                vec3 gradResult = gradientMap(overlayImg,gradientSampler,filterArea,clampX,0.0);
                gradResult = hardLightBlend(gradResult,textureImage.rgb);
            
                inputImage.rgb = gradResult;
            
                gl_FragColor = inputImage;
            }`
        }
    },

    mask: {
        vertex: `attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        uniform mat3 otherMatrix;
        
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        
            vTextureCoord = aTextureCoord;
            vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;
        }`,

        cutoutFragment: `#define GLSLIFY 1
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
         
        uniform sampler2D uSampler;
        uniform sampler2D mask;        
        uniform float alpha;
        uniform float r;
        uniform float g;
        uniform float b;
        // Coords
        uniform float w;
        uniform float h;
        uniform float x;
        uniform float y;

        uniform sampler2D blurImage;
         
        varying vec4 temp;         
        void main(void) {
        	//float x = 1.0;
        	//float y = 341.0;
        	//float w = 1024.0;
        	//float h = 683.0;
        	
        	//1024x683
            vec2 maskyCord = vTextureCoord - (vec2(1.0/w,1.0/h))-vec2(x/w,y/h);
               
           vec4 original = texture2D(uSampler, vTextureCoord);
		   vec4 blur = texture2D(blurImage, vTextureCoord);
           vec4 originalImage = texture2D(uSampler, vTextureCoord);
           vec4 color = vec4(0.0);
           vec4 masky = texture2D(mask, maskyCord); //  + vec2(0.3, 0.1)
           //TODO
           vec4 col = vec4(r,g,b, 1.0);
           
           if(masky.a != 0.0){
           	masky = vec4(0.0, 0.0, 0.0, masky.a);
           }
           
           
           if(masky.r == 0.0){
		    	float a1 = 1.0-alpha; 
				vec4 col = vec4(r,g,b, 1.0); //*alpha;
		       	color = (a1*(blur)+(1.0-a1)*col)*(1.0-masky.a);
           } else {
           		color = vec4(r,g,b, alpha);           	
           }
           
            gl_FragColor = color; 
        }`,
        
        cutoutFragmentText: `#define GLSLIFY 1
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
         
        uniform sampler2D uSampler;
        uniform sampler2D mask;        
        uniform float alpha;
        uniform float r;
        uniform float g;
        uniform float b;
        // Coords
        uniform float w;
        uniform float h;
        uniform float x;
        uniform float y;
        uniform float stage_w;
        uniform float stage_h;
        uniform vec2 wh;
        
        
        uniform vec2 position;
        uniform vec2 scale_diff;
        uniform float zoomProcentage;

        uniform sampler2D blurImage;
        //position
         
        varying vec4 temp;         
        void main(void) {

           vec2 maskyCord = ((vTextureCoord - position) / scale_diff) * zoomProcentage;
               
           vec4 original = texture2D(uSampler, vTextureCoord);
		   vec4 blur = texture2D(blurImage, vTextureCoord);
           vec4 originalImage = texture2D(uSampler, vTextureCoord);
           vec4 color = vec4(0.0);
           vec4 masky = texture2D(mask, maskyCord); //  + vec2(0.3, 0.1)
           //TODO
           vec4 col = vec4(r,g,b, 1.0);
           
           if(masky.a != 0.0){
           	masky = vec4(0.0, 0.0, 0.0, masky.a);
           }
           
           if(masky.r == 0.0){
           		if(vTextureCoord.x > position.x && vTextureCoord.y > position.y && vTextureCoord.x < (wh.x) && vTextureCoord.y < (wh.y)){
					float a1 = 1.0-alpha; 
					vec4 col = vec4(r,g,b, 1.0); 
				   	color = (a1*(blur)+(1.0-a1)*col)*(1.0-masky.a);
           		} else {
					float a1 = 1.0-alpha; 
					vec4 col = vec4(r,g,b, 1.0); 
				   	color = (a1*(blur)+(1.0-a1)*col); //*(1.0-masky.a);
           		}
           } else {
           		color = vec4(r,g,b, alpha);           	
           }
           
            gl_FragColor = color; 
        }`,

        cutoutFragmentClear: `#define GLSLIFY 1
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
        uniform vec2 scale_diff;
        uniform sampler2D uSampler;
        uniform sampler2D mask;        
        uniform float alpha;
        uniform float r;
        uniform float g;
        uniform float b;
        // Coords
        uniform float w;
        uniform float h;
        uniform float x;
        uniform vec4 maskClamp;
        uniform float y;
        uniform bool invert;
          
        varying vec4 temp;         
        void main(void) {
           // vec2 maskyCord = (vTextureCoord - (vec2(1.0/w,1.0/h))-vec2(x/w,y/h));
           vec2 maskyCord = (vTextureCoord); /// vec2(2., 2.);
           
        //    maskyCord.x = clamp(maskyCord.x, 0., 1.0);
        //    maskyCord.y = clamp(maskyCord.y, 0., 1.0);
           
           vec4 color = texture2D(uSampler, vTextureCoord);
           vec4 masky = texture2D(mask, maskyCord);
           vec4 colorCoord = texture2D(uSampler, vTextureCoord);
           
           if(colorCoord.a == 0.0) {
            gl_FragColor = colorCoord;
           } else {
            if(invert) {
                if (masky.a != 1.0 && maskyCord.x < 1.0 && maskyCord.y < 1.0) {
                    color = vec4(color.rgb, 1.0) * masky.a;
                }
               } else {
                if (masky.a != 0.0 && maskyCord.x < 1.0 && maskyCord.y < 1.0) {
                    color = vec4(color.rgb, 1.0) * (1. - masky.a);
                }
               }
            
                gl_FragColor = color; 
           }
        }`,

        surfaceLayerFragment: `#define GLSLIFY 1
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
         
        uniform sampler2D uSampler;
        uniform sampler2D mask;        
        uniform float alpha;
        uniform float r;
        uniform float g;
        uniform float b;
        // Coords
        uniform float w;
        uniform float h;
        uniform float x;
        uniform vec4 maskClamp;
        uniform float y;

        uniform sampler2D blurImage;
         
        varying vec4 temp;         
        void main(void) {
        	//float x = 1.0;
        	//float y = 341.0;
        	//float w = 1024.0;
        	//float h = 683.0;
        	
        	//1024x683
           vec2 maskyCord = vTextureCoord - (vec2(1.0/w,1.0/h))-vec2(x/w,y/h);
           
           maskyCord.x = clamp(maskyCord.x, 0., 1.0);
	       maskyCord.y = clamp(maskyCord.y, 0., 1.0);

           
           
		   vec4 blur = texture2D(blurImage, vTextureCoord);
           vec4 color = texture2D(uSampler, vTextureCoord);
           vec4 masky = texture2D(mask, maskyCord); 
        	float a1 = 1.0-0.0;
    		vec4 col = vec4(r,g,b, 1.0);
	        if (masky.a != 0.0 && maskyCord.x < 1.0 && maskyCord.y < 1.0) {
	        	float a1 = 1.0-alpha; 
	    		vec4 col = vec4(r,g,b, 1.0); //*alpha;
		        color = (a1*(blur)+(1.0-a1)*col)*masky.a;
	        } else {
	            color = vec4(0.0);
	        }

            gl_FragColor = color; 
        }`,
        v: `attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        uniform mat3 otherMatrix;
        
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        
            vTextureCoord = aTextureCoord;
            vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;
        }`,

        // surfaceLayerFragment: `varying vec2 vMaskCoord;
        // varying vec2 vTextureCoord;
        
        // uniform sampler2D uSampler;
        // uniform sampler2D blurImage;
        // uniform sampler2D mask;
        // uniform float alpha;
        // uniform float inverse;
        // uniform vec4 maskClamp;
        // uniform float alphaOnly;

        // uniform float r;
        // uniform float g;
        // uniform float b;
        
        // void main(void)
        // {
        //     float clip = step(3.5,
        //         step(maskClamp.x, vMaskCoord.x) +
        //         step(maskClamp.y, vMaskCoord.y) +
        //         step(vMaskCoord.x, maskClamp.z) +
        //         step(vMaskCoord.y, maskClamp.w));
        
        //     vec4 original = texture2D(blurImage, vTextureCoord);
        //     vec4 originalCopy = original;   
        //     vec4 masky = texture2D(mask, vMaskCoord);
        
        //     original *= abs(1.-(masky.r * masky.a * alpha * clip));

        //     vec4 col = vec4(r,g,b, alpha);
        //     gl_FragColor = (alpha * original) + col * masky.a;
        // }`
    },

    overflowFilter: {
        vertex: `attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        uniform mat3 otherMatrix;
        
        varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        
            vTextureCoord = aTextureCoord;
            vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;
        }`,

        fragment: `varying vec2 vMaskCoord;
        varying vec2 vTextureCoord;
         
        uniform sampler2D uSampler;
        uniform float alpha;
        uniform float r;
        uniform float g;
        uniform float b;
         
        varying vec4 temp;         
        void main(void)
        {
            vec4 original = texture2D(uSampler, vTextureCoord);
            vec4 color = texture2D(uSampler, vTextureCoord);
         
            if (original.a != 0.0) {
                color = vec4(r, g, b, alpha);
                color *= alpha;
            }
            
            gl_FragColor = color;
        }`
    },

    test: {
        vertex: `attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void) {
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        uniform float angle;

        void main() {
            vec2 uv = vTextureCoord;
            vec2 offset = vec2(.5, .5);
            
            uv -= offset;
            //float ratio = uv.x / uv.y;
            // uv.x *= uv.x / uv.y;

            float rot = radians(angle);
            
            mat2 m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
            uv  = m * uv;
            
            uv+=offset;
            
            gl_FragColor = texture2D(uSampler, uv);
            
            if(uv.x >= 0. && uv.y >= 0.  && uv.x <= 1. && uv.y <= 1.) {
                gl_FragColor = texture2D(uSampler, uv);
            } else {
                gl_FragColor = vec4(0.);
            }
        }`
    },

    colorOverlay: {
        vertex: `attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        
        varying vec2 vTextureCoord;
        
        void main(void)
        {
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,
        fragment: `varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float r;
        uniform float g;
        uniform float b;
        uniform float alpha;
        
        void main(void) {
            vec4 currentColor = texture2D(uSampler, vTextureCoord);
            vec4 color = texture2D(uSampler, vTextureCoord);

	        if (currentColor.a != 0.0) {
	        	float a1 = 1.0-alpha; 
	    		vec4 col = vec4(r, g, b, 1.0);
                color = (a1*(currentColor)+(1.0-a1)*col)*currentColor.a;
	        } else {
	            color = vec4(0.0);
	        }

            gl_FragColor = color;
        }`
    },

    replaceColorUpd: `float A(vec3 B,vec3 C) {
        const float D=0.045;
        const float E=0.015;
        const float F=1.;
        const float G=0.5;
        const float H=0.5;
        float I=sqrt(B.y*B.y+B.z*B.z);
        float J=sqrt(C.y*C.y+C.z*C.z);
        float K=B.y-C.y;
        float L=B.z-C.z;
        float M=I-J;
        float N=K*K+L*L-M*M;
        float O=(N>0.)?sqrt(N):0.;
        float P=B.x-C.x;
        float Q=1.;
        float R=1.+D*I;
        float S=1.+E*I;
        float T=P/(F*Q);
        float U=M/(G*R);
        float V=O/(H*S);
    
        return sqrt(T*T+U*U+V*V);
    }
    
    vec3 W(vec3 X){
        vec3 Y=X/vec3(95.047,100,108.883);
        vec3 Z;
        Z.x=(Y.x>0.008856)?pow(Y.x,1./3.):(7.787*Y.x)+(16./116.);
        Z.y=(Y.y>0.008856)?pow(Y.y,1./3.):(7.787*Y.y)+(16./116.);
        Z.z=(Y.z>0.008856)?pow(Y.z,1./3.):(7.787*Y.z)+(16./116.);
        
        return vec3((116.*Z.y)-16.,500.*(Z.x-Z.y),200.*(Z.y-Z.z));
    }
    
    vec3 a(vec3 X){
        vec3 b;
    
        b.x=(X.r>0.04045)?pow((X.r+0.055)/1.055,2.4):X.r/12.92;
        b.y=(X.g>0.04045)?pow((X.g+0.055)/1.055,2.4):X.g/12.92,
        b.z=(X.b>0.04045)?pow((X.b+0.055)/1.055,2.4):X.b/12.92;
        
        return 100.*b*mat3(0.4124,0.3576,0.1805,0.2126,0.7152,0.0722,0.0193,0.1192,0.9505);
    }
    
    vec3 c(vec3 X){
        vec3 d=W(a(X));
        
        return vec3(d.x/100.,0.5+0.5*(d.y/127.),0.5+0.5*(d.z/127.));
    }
    
    float e(vec3 X){
        return dot(X,vec3(0.299,0.587,0.114));
    }
    
    vec3 f(vec3 X){
        float g=e(X);
        float Y=min(min(X.r,X.g),X.b);
        float h=max(max(X.r,X.g),X.b);
        
        if(Y<0.) { max((X-g)*g/(g-Y)+g,0.); }
        if(h>1.) { min((X-g)*(1.-g)/(h-g)+g,1.); }
    
        return X;
    }
    
    float i(vec3 X) {
        return dot(X,vec3(0.299,0.587,0.114));
    }
    
    vec3 j(vec3 X,float g) {
        float k=g-i(X);
        X=X+vec3(k);
        
        return f(X);
    }
    
    float l(vec3 X) {
        return dot(X,vec3(0.299,0.587,0.114));
    }
    
    vec3 m(vec3 n,vec3 o) {
        return vec3(j(n.rgb,l(o.rgb)));
    }
    
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform vec3 sourceColor;
    uniform vec3 targetColor;
    uniform float targetAlpha;
    uniform float preserveLuminosity;
    uniform float tolerance;
    
    void main(void){
        vec4 p=texture2D(uSampler,vTextureCoord);
        vec4 q=vec4(vec3(targetColor*targetAlpha),targetAlpha);
        vec4 r=(p.a==0.)?q:p;
        
        if(sourceColor.r!=-1.){
            vec3 s=c(sourceColor);
            vec3 t=c(targetColor);
            vec3 u=c(p.rgb);
            float v=A(u,s);v=smoothstep(0.,tolerance,v);
            
            if(preserveLuminosity==1.){
                q.rgb=m(q.rgb,p.rgb);
                q=vec4(vec3(q*targetAlpha),targetAlpha);
            }
            
            r=(p.a==0.)?vec4(0.):mix(q,p,v);
        }
            
        gl_FragColor=r;
    }`,

    vgn: {
        vertex: `attribute vec4 position;
        attribute vec2 uv;
        uniform mat4 projection;
        uniform mat4 view;
        uniform mat4 model;
        
        varying vec2 vUv;
        
        void main() {
            gl_Position = projection * view * model * position;
            vUv = uv;
        }`,
        fragment: `
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        float Falloff = 0.25;
    
        vec4 fragColor = texture2D(uSampler, vTextureCoord);
        
        
        void main() {
            vec2 uv = vec2(vTextureCoord.x, 1.-vTextureCoord.y);
            vec2 coord = (uv - 0.5) * (vTextureCoord.x/vTextureCoord.y) * 2.0;
            float rf = sqrt(dot(coord, coord)) * Falloff;
            float rf2_1 = rf * rf + 1.0;
            float e = 1.0 / (rf2_1 * rf2_1);
            
            vec4 src = vec4(1.0,1.0,1.0,1.0);
            fragColor = vec4(src.rgb * e, 1.0);
        }`
    },

    tint: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#define GLSLIFY 1

        float getLumo_1(vec3 c) {
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
         vec3 clipColor(vec3 c) {
             float l = getLumo_1(c);
             float n = min(min(c.r, c.g), c.b);
             float x = max(max(c.r, c.g), c.b);
        
             if (n < 0.0) {
                  max((c-l)*l / (l-n) + l, 0.0);
             }
             if (x > 1.0) {
                  min((c-l) * (1.0-l) / (x-l) + l, 1.0);
             }
        
             return c;
         }
        
        float getLumo_2(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        vec3 setlum(vec3 c, float l) {
             float d = l - getLumo_2(c);
             c = c + vec3(d);
             return clipColor(c);
        }
        
        float getLumo_0(vec3 c) {
        
             return dot(c, vec3(0.299, 0.587, 0.114));
        }
        
        vec3 tint(vec3 inpImage, vec3 color1) {
            return setlum(color1, getLumo_0(inpImage));
        
        }
        
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec3 color;
        
        void main(void){
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            inputImage.rgb = tint(inputImage.rgb,color);
            gl_FragColor = inputImage;
        }`
    },

    ff: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,
        fragment: `uniform sampler2D uSampler;
        uniform float tTime;
        uniform float thickDistortion;
        uniform float fineDistortion;
        uniform float badTVSpeed;
        uniform float rollSpeed;
        uniform vec2 iResolution;
        varying vec2 vTextureCoord;
        
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        vec2 mod289(vec2 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        vec3 permute(vec3 x) {
          return mod289(((x*34.0)+1.0)*x);
        }
        float snoise(vec2 v)
          {
          const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                              0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                             -0.577350269189626,  // -1.0 + 2.0 * C.x
                              0.024390243902439); // 1.0 / 41.0
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
         x12.xy -= i1;
          i = mod289(i); // Avoid truncation effects in permutation
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        void main() {
        vec2 p = vTextureCoord;
        float ty = tTime * badTVSpeed * 17.346;
        float yt = p.y - ty;
        float offset = snoise(vec2(yt*3.0,0.0))*0.2;
        offset = offset*thickDistortion * offset*thickDistortion * offset;
        offset += snoise(vec2(yt*50.0,0.0))*fineDistortion*0.002;
        gl_FragColor = texture2D(uSampler,  vec2(fract(p.x + offset),fract(p.y - tTime * rollSpeed) ));
        }`
    },

    f: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,
        fragment: `#define GLSLIFY 1
        vec3 duotone(vec3 inpImage, vec3 color1, vec3 color2)
        {
            float v = max(max(inpImage.r, inpImage.g), inpImage.b);
            return color1*v+color2*(1.0-v);
        
        }
        
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec3 color1;
        uniform vec3 color2;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            gl_FragColor = vec4(duotone(inputImage.rgb, color1, color2), inputImage.a);
        }`
    },

    blurImage: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        
        uniform sampler2D blurImage;
        uniform float size;
        uniform float shift_horizontal;
        uniform float shift_vertical;
        uniform float clampX;
        uniform float clampY;
        
        vec3 blurBorderMask(vec3 inpImg, vec2 coord,vec2 cXcY, float amount, vec2 slideXY)
        {
            vec2 uv = (coord*cXcY)-vec2(slideXY);
            uv = uv * 2.0 - 1.0;
            float a = sqrt(pow(abs(uv.x),10.0) + pow(abs(uv.y),10.0));
            a = smoothstep(0.0,1.0-amount,a);
            return mix(inpImg,vec3(1.0),a);
        
        }
        
        void main(void)
        {
            size;shift_horizontal;shift_vertical;
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            vec4 bImage = texture2D(blurImage, vTextureCoord * vec2(clampX,clampY));
        
            vec3 mask = blurBorderMask(vec3(0.0),vTextureCoord,vec2(clampX,clampY),size,vec2(shift_horizontal,shift_vertical));
            inputImage.rgb = mix(inputImage.rgb,bImage.rgb,mask);
        
            gl_FragColor = inputImage;
        
        }
        `
    },

    export: {
        defaultVertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        badtvFragment: `varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float tTime;
        uniform float thickDistortion;
        uniform float fineDistortion;
        uniform float badTVSpeed;
        uniform float rollSpeed;
        uniform vec2 iResolution;
        
        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec2 mod289(vec2 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec3 permute(vec3 x) {
            return mod289(((x*34.0)+1.0)*x);
        }

        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                                0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                                -0.577350269189626,  // -1.0 + 2.0 * C.x
                                0.024390243902439); // 1.0 / 41.0
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i); // Avoid truncation effects in permutation
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))  + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec2 p = vTextureCoord;
            float ty = tTime * badTVSpeed * 17.346;
            float yt = p.y - ty;
            float offset = snoise(vec2(yt*3.0,0.0))*0.2;
            offset = offset*thickDistortion * offset*thickDistortion * offset;
            offset += snoise(vec2(yt*50.0,0.0))*fineDistortion*0.002;
            gl_FragColor = texture2D(uSampler,  vec2(fract(p.x + offset),fract(p.y - tTime * rollSpeed)));
        }`,

        linearFragment: `varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float tTime;
        uniform float count;
        uniform float noiseAmount;
        uniform float linesAmount;
        uniform float tResolutionHeight;

        #define PI 3.14159265359
            highp float rand(const in vec2 uv) {
            const highp float a = 12.9898, b = 78.233, c = 43758.5453;
            highp float dt = dot(uv.xy, vec2( a,b )), sn = mod(dt, PI);
            return fract(sin(sn) * c);
        }

        void main() {
            vec4 cTextureScreen = texture2D(uSampler, vTextureCoord);
            float dx = rand(vTextureCoord + tTime);
            vec3 cResult = cTextureScreen.rgb * dx * noiseAmount;
            float lineAmount = tResolutionHeight * 1.8 * count;
            vec2 sc = vec2(sin(vTextureCoord.y * lineAmount), cos(vTextureCoord.y * lineAmount));
            cResult += cTextureScreen.rgb * vec3(sc.x, sc.y, sc.x) * linesAmount;
            cResult = cTextureScreen.rgb + ( cResult );
            gl_FragColor =  vec4(cResult, cTextureScreen.a);
        }`,

        rainbowFragment: `uniform sampler2D uSampler;
        uniform float rainbowAmount;
        uniform float offset;
        uniform float tTime;
        varying vec2 vTextureCoord;

        vec3 rainbow2( in float t ){
        vec3 d = vec3(0.0,0.33,0.67);
            return 0.5 + 0.5*cos( 6.28318*(t+d) );
        }

        void main() {
            vec2 p = vTextureCoord;
            vec3 origCol = texture2D( uSampler, p ).rgb;
            vec2 off = texture2D( uSampler, p ).rg - 0.5;
            p += off * offset;
            vec3 rb = rainbow2( (p.x + p.y + tTime * 2.0) * 0.5);
            vec3 col = mix(origCol,rb,rainbowAmount);
            gl_FragColor = vec4(col, 1.0);
        }`,

        hueSaturationFragment: `uniform sampler2D uSampler;
        uniform float hue;
        uniform float saturation;
        varying vec2 vTextureCoord;

        void main() {
            gl_FragColor = texture2D( uSampler, vTextureCoord);
            float angle = hue * 3.14159265;
            float s = sin(angle), c = cos(angle);
            vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;
            float len = length(gl_FragColor.rgb);
            gl_FragColor.rgb = vec3(
            dot(gl_FragColor.rgb, weights.xyz),
            dot(gl_FragColor.rgb, weights.zxy),
            dot(gl_FragColor.rgb, weights.yzx)
            );
            float average = (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b) / 3.0;
            
            if (saturation > 0.0) {
                gl_FragColor.rgb += (average - gl_FragColor.rgb) * (1.0 - 1.0 / (1.001 - saturation));
            } else {
                gl_FragColor.rgb += (average - gl_FragColor.rgb) * (-saturation);
            }
        }`,

        glowFragment: `uniform sampler2D uSampler;
        uniform float size;
        uniform float glowAmount;
        uniform vec2 tResolution;
        uniform float darkness;
        varying vec2 vTextureCoord;

        void main() {
            float h = size / tResolution.x;
            float v = size / tResolution.y;
            vec4 sum = vec4( 0.0 );
            sum += (texture2D( uSampler, vec2( vTextureCoord.x - 4.0 * h, vTextureCoord.y ) )- darkness) * 0.051 ;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x - 3.0 * h, vTextureCoord.y ) )- darkness) * 0.0918;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x - 2.0 * h, vTextureCoord.y ) )- darkness) * 0.12245;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x - 1.0 * h, vTextureCoord.y ) )- darkness) * 0.1531;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y ) )- darkness) * 0.1633;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x + 1.0 * h, vTextureCoord.y ) )- darkness) * 0.1531;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x + 2.0 * h, vTextureCoord.y ) )- darkness) * 0.12245;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x + 3.0 * h, vTextureCoord.y ) )- darkness) * 0.0918;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x + 4.0 * h, vTextureCoord.y ) )- darkness) * 0.051;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 4.0 * v ) )- darkness) * 0.051;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 3.0 * v ) )- darkness) * 0.0918;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 2.0 * v ) )- darkness) * 0.12245;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 1.0 * v ) )- darkness) * 0.1531;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y ) )- darkness) * 0.1633;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 1.0 * v ) )- darkness) * 0.1531;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 2.0 * v ) )- darkness) * 0.12245;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 3.0 * v ) )- darkness) * 0.0918;
            sum += (texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 4.0 * v ) )- darkness) * 0.051;
            vec4 base = texture2D( uSampler, vTextureCoord );
            gl_FragColor = base + max(sum,0.0) * glowAmount;
        }`,

        layerOffsetRGBFragment: `uniform sampler2D uSampler;
        uniform float rgbShiftAmount;
        uniform float angle;
        varying vec2 vTextureCoord;

        void main() {
            vec2 offset = rgbShiftAmount * vec2( cos(angle), sin(angle));
            vec4 cr = texture2D(uSampler, vTextureCoord + offset);
            vec4 cga = texture2D(uSampler, vTextureCoord);
            vec4 cb = texture2D(uSampler, vTextureCoord - offset);
            gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);
        }`,

        mirrorFragment: `uniform sampler2D uSampler;
        uniform int side;
        varying vec2 vTextureCoord;

        void main() {
            vec2 p = vTextureCoord;
            if (side == 0){
            if (p.x > 0.5) p.x = 1.0 - p.x;
            }else if (side == 1){
            if (p.x < 0.5) p.x = 1.0 - p.x;
            }else if (side == 2){
            if (p.y < 0.5) p.y = 1.0 - p.y;
            }else if (side == 3){
            if (p.y > 0.5) p.y = 1.0 - p.y;
            } 
            vec4 color = texture2D(uSampler, p);
            gl_FragColor = color;
        }`,

        glitcherFragment: `uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        uniform float glitcherAmount;
        uniform float speed;
        uniform float tTime;

        float random1d(float n){
            return fract(sin(n) * 43758.5453);
        }

        float random2d(vec2 n) { 
            return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float randomRange (in vec2 seed, in float min, in float max) {
            return min + random2d(seed) * (max - min);
        }

        float insideRange(float v, float bottom, float top) {
            return step(bottom, v) - step(top, v);
        }

        float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vTextureCoord;
            float sTime = floor(tTime * speed * 6.0 * 24.0);
            vec3 inCol = texture2D(uSampler, uv).rgb;
            vec3 outCol = inCol;
            float maxOffset = glitcherAmount/2.0;
            vec2 uvOff;
            for (float i = 0.0; i < 10.0; i += 1.0) {
                if (i > 10.0 * glitcherAmount) break;
                float sliceY = random2d(vec2(sTime + glitcherAmount, 2345.0 + float(i)));
                float sliceH = random2d(vec2(sTime + glitcherAmount, 9035.0 + float(i))) * 0.25;
                float hOffset = randomRange(vec2(sTime + glitcherAmount, 9625.0 + float(i)), -maxOffset, maxOffset);
                uvOff = uv;
                uvOff.x += hOffset;
                vec2 uvOff = fract(uvOff);

                if (insideRange(uv.y, sliceY, fract(sliceY+sliceH)) == 1.0 ){
                    outCol = texture2D(uSampler, uvOff).rgb;
                }
            }
            float maxColOffset = glitcherAmount/6.0;
            vec2 colOffset = vec2(randomRange(vec2(sTime + glitcherAmount, 3545.0),-maxColOffset,maxColOffset), randomRange(vec2(sTime , 7205.0),-maxColOffset,maxColOffset));
            uvOff = fract(uv + colOffset);
            float rnd = random2d(vec2(sTime + glitcherAmount, 9545.0));
            
            if (rnd < 0.33){
                outCol.r = texture2D(uSampler, uvOff).r;
            } else if (rnd < 0.66){
                outCol.g = texture2D(uSampler, uvOff).g;
            } else{
                outCol.b = texture2D(uSampler, uvOff).b;
            }

            gl_FragColor = vec4(outCol,1.0);
        }`,

        edgeFragment: `uniform sampler2D uSampler;
        uniform float edgeAmount;
        uniform float passthru;
        varying vec2 vTextureCoord;
        vec2 texel = vec2(1.0 /512.0);
        mat3 G[2];
        const mat3 g0 = mat3( 1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0 );
        const mat3 g1 = mat3( 1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0 );
        
        void main(void) {
            mat3 I;
            float cnv[2];
            vec3 sample;
            G[0] = g0;
            G[1] = g1;
            for (float i=0.0; i<3.0; i++)
            for (float j=0.0; j<3.0; j++) {
                sample = texture2D( uSampler, vTextureCoord + texel * vec2(i-1.0,j-1.0) ).rgb;
                I[int(i)][int(j)] = length(sample);
            }
            for (int i=0; i<2; i++) {
                float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);
                cnv[i] = dp3 * dp3; 
            }

            vec4 orig = texture2D( uSampler, vTextureCoord);
            vec4 result = orig * passthru + vec4(0.5 * sqrt(cnv[0]*cnv[0]+cnv[1]*cnv[1])) * edgeAmount;
            gl_FragColor = vec4(result.rgb, 1.0);
        }`,

        solarizeFragment: `uniform sampler2D uSampler;
        uniform float centerBrightness;
        uniform float powerCurve;
        uniform float colorize;
        varying vec2 vTextureCoord;

        vec3 rgb2hsv(vec3 c)	{
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);
            vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        vec3 hsv2rgb(vec3 c)	{
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main() {
            vec3 origCol = texture2D( uSampler, vTextureCoord).rgb;
            vec3 hslColor = rgb2hsv(origCol);
            vec3 outColor = hslColor;
            outColor.b = pow(outColor.b, powerCurve);
            outColor.b = (outColor.b < centerBrightness) ? (1.0 - outColor.b / centerBrightness) : (outColor.b - centerBrightness) / centerBrightness;
            outColor.g = outColor.g * hslColor.b * colorize;
            outColor = hsv2rgb(outColor);
            gl_FragColor = vec4(outColor, 1.0);
        }`,

        barrelBlurFragment: `uniform sampler2D uSampler;
        uniform float barrelBlurAmount;
        uniform float tTime;
        varying vec2 vTextureCoord;
        const int num_iter = 16;
        const float reci_num_iter_f = 1.0 / float(num_iter);
        const float gamma = 2.2;
        const float MAX_DIST_PX = 200.0;

        vec2 barrelDistortion( vec2 p, vec2 amt ) {
            p = 2.0*p-1.0;
            //float BarrelPower = 1.125;
            const float maxBarrelPower = 3.0;
            float theta  = atan(p.y, p.x);
            float radius = length(p);
            radius = pow(radius, 1.0 + maxBarrelPower * amt.x);
            p.x = radius * cos(theta);
            p.y = radius * sin(theta);
            return 0.5 * ( p + 1.0 );
        }

        float sat( float t ) {
            return clamp( t, 0.0, 1.0 );
        }
        
        float linterp( float t ) {
            return sat( 1.0 - abs( 2.0*t - 1.0 ) );
        }

        float remap( float t, float a, float b ) {
            return sat( (t - a) / (b - a) );
        }

        vec3 spectrum_offset( float t) {
            vec3 ret;
            float lo = step(t,0.5);
            float hi = 1.0-lo;
            float w = linterp( remap( t, 1.0/6.0, 5.0/6.0 ) );
            ret = vec3(lo,1.0,hi) * vec3(1.0-w, w, 1.0-w);
        
            return pow( ret, vec3(1.0/2.2) );
        }

        float nrand( vec2 n){
            return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
        }

        vec3 lin2srgb( vec3 c){
            return pow( c, vec3(gamma) );
        }

        vec3 srgb2lin( vec3 c){
            return pow( c, vec3(1.0/gamma));
        }

        void main() {
            vec2 uv = vTextureCoord;
            vec2 max_distort = vec2(barrelBlurAmount);
            vec2 oversiz = barrelDistortion( vec2(1,1), max_distort );
            uv = 2.0 * uv - 1.0;
            uv = uv / (oversiz*oversiz);
            uv = 0.5 * uv + 0.5;
            vec3 sumcol = vec3(0.0);
            vec3 sumw = vec3(0.0);
            float rnd = nrand( uv + fract(tTime) );

            for ( int i=0; i<num_iter;++i ){
                float t = (float(i)+rnd) * reci_num_iter_f;
                vec3 w = spectrum_offset( t );
                sumw += w;
                sumcol += w * srgb2lin(texture2D( uSampler, barrelDistortion(uv, max_distort*t ) ).rgb);
            }

            sumcol.rgb /= sumw;
            vec3 outcol = lin2srgb(sumcol.rgb);
            outcol += rnd/255.0;
            gl_FragColor = vec4( outcol, 1.0);
        }`,

        smearFragment: `const float TWO_PI = 6.283185307179586;
        uniform sampler2D uSampler;
        uniform float smearAmount;
        uniform float tTime;
        varying vec2 vTextureCoord;

        vec2 rotate2D(vec2 position, float theta) {
        mat2 m = mat2( cos(theta), -sin(theta), sin(theta), cos(theta) );
            return m * position;
        }

        void main() {
            vec2 p = vTextureCoord;
            vec2 sPos = vTextureCoord;
            vec2 off = texture2D( uSampler, sPos ).rg - 0.5;
            float ang = tTime * TWO_PI;
            off = rotate2D(off,ang);
            p += off * smearAmount;
            vec4 col = texture2D(uSampler,p);
            gl_FragColor = col;
        }`,

        noiseDisplaceFragment: `uniform sampler2D uSampler;
        uniform float tTime;
        uniform float scale;
        uniform float noiseDisplaceAmount;
        uniform float noiseDisplaceSpeed;
        varying vec2 vTextureCoord;

        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec2 mod289(vec2 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec3 permute(vec3 x) {
          return mod289(((x*34.0)+1.0)*x);
        }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                              0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                             -0.577350269189626,  // -1.0 + 2.0 * C.x
                              0.024390243902439); // 1.0 / 41.0
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i); // Avoid truncation effects in permutation
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        float getNoise(vec2 uv, float t){
            uv -= 0.5;
            float scl = 4.0 * scale;
            float noise = snoise( vec2(uv.x * scl ,uv.y * scl - t * noiseDisplaceSpeed ));
            scl = 16.0 * scale;
            noise += snoise( vec2(uv.x * scl + t* noiseDisplaceSpeed ,uv.y * scl )) * 0.2 ;
            scl = 26.0 * scale;
            noise += snoise( vec2(uv.x * scl + t* noiseDisplaceSpeed ,uv.y * scl )) * 0.2 ;
            return noise;
        }

        void main() {
            vec2 uv = vTextureCoord;
            float noise = getNoise(uv, tTime * 24.0);
            vec2 noiseUv = uv + noiseDisplaceAmount * noise;
            noiseUv = fract(noiseUv);
            gl_FragColor = texture2D(uSampler,noiseUv);
        }`,

        verticalTiltShiftFragment: `uniform sampler2D uSampler;
        uniform float verticalTiltShiftAmount;
        uniform float verticalTiltShiftPosition;
        varying vec2 vTextureCoord;

        void main() {
            vec4 sum = vec4( 0.0 );
            float vv = verticalTiltShiftAmount * abs( verticalTiltShiftPosition - vTextureCoord.y );
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 4.0 * vv ) ) * 0.051;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 3.0 * vv ) ) * 0.0918;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 2.0 * vv ) ) * 0.12245;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y - 1.0 * vv ) ) * 0.1531;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y ) ) * 0.1633;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 1.0 * vv ) ) * 0.1531;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 2.0 * vv ) ) * 0.12245;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 3.0 * vv ) ) * 0.0918;
            sum += texture2D( uSampler, vec2( vTextureCoord.x, vTextureCoord.y + 4.0 * vv ) ) * 0.051;
            gl_FragColor = sum;
        }`,

        wobbleFragment: `uniform sampler2D uSampler;
        uniform float tTime;
        uniform float strength;
        uniform float size;
        uniform float wobbleSpeed;
        varying vec2 vTextureCoord;
        const float TWO_PI = 6.283185307179586;

        void main() {
            vec2 p = -1.0 + 2.0 * vTextureCoord;
            float pos = tTime * TWO_PI + length(p * size);
            gl_FragColor = texture2D(uSampler, vTextureCoord + strength * vec2(cos(pos), sin(pos)));
        }`,

        pixelateFragment: `uniform sampler2D uSampler;
        uniform float pixelsX;
        uniform float pixelsY;
        varying vec2 vTextureCoord;

        void main() {
            vec2 p = vTextureCoord;
            p.x = floor(p.x * pixelsX)/pixelsX + 0.5/pixelsX;
            p.y = floor(p.y * pixelsY)/pixelsY + 0.5/pixelsY;
            gl_FragColor = texture2D(uSampler, p);
        }`,

        polarPixelateFragment: `uniform sampler2D uSampler;
        uniform float radius;
        uniform float segments;
        varying vec2 vTextureCoord;

        void main() {
            vec2 normCoord = 2.0 * vTextureCoord - 1.0;
            float r = length(normCoord);
            float phi = atan(normCoord.y, normCoord.x);
            r = r - mod(r, radius) + 0.03;
            phi = phi - mod(phi, segments);
            normCoord.x = r * cos(phi);
            normCoord.y = r * sin(phi);
            vec2 textureCoordinateToUse = normCoord / 2.0 + 0.5;
            gl_FragColor = texture2D(uSampler, textureCoordinateToUse );
        }`,

        dotMatrixFragment: `uniform sampler2D uSampler;
        uniform float dots;
        uniform float size;
        uniform float blur;
        varying vec2 vTextureCoord;

        void main() {
            float dotSize = 1.0/dots;
            vec2 samplePos = vTextureCoord - mod(vTextureCoord, dotSize) + 0.5 * dotSize;
            float distanceFromSamplePoint = distance(samplePos, vTextureCoord);
            vec4 col = texture2D(uSampler, samplePos);
            gl_FragColor = mix(col, vec4(0.0), smoothstep(dotSize * size, dotSize *(size + blur), distanceFromSamplePoint));
        }`,

        dotScreenFragment: `uniform vec2 center;
        uniform float angle;
        uniform float dotScreenScale;
        uniform vec2 tSize;
        uniform sampler2D uSampler;
        varying vec2 vTextureCoord;

        float pattern() {
            float s = sin(angle), c = cos(angle);
            vec2 tex = vTextureCoord * tSize - center;
            vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * dotScreenScale;
            return ( sin( point.x ) * sin( point.y ) ) * 4.0;
        }
        void main() {
            vec4 color = texture2D(uSampler, vTextureCoord);
            float average = ( color.r + color.g + color.b ) / 3.0;
            gl_FragColor = vec4( vec3( average * 10.0 - 5.0 + pattern() ), color.a );
        }`,

        linocutFragment: `uniform sampler2D uSampler;
        varying vec2 vTextureCoord;
        uniform vec2 tResolution;
        uniform float linocutScale;

        float luma(vec3 color) {
            return dot(color, vec3(0.299, 0.587, 0.114));
        }

        void main() {
            vec2 center = vec2(0.5);
            vec2 uv = vTextureCoord;
            float noiseScale = 1.;
            float radius = 0.5;
            vec2 d = uv - center;
            float r = length(d * vec2( 1., tResolution.y / tResolution.x )) * linocutScale;
            float a = atan(d.y,d.x) + noiseScale*(radius-r)/radius;
            vec2 uvt = center+r*vec2(cos(a),sin(a));
            vec2 uv2 = vTextureCoord;
            float c = (.75 + .25 * sin( uvt.x * 1000.));
            vec4 color = texture2D( uSampler, uv2 );
            float l = luma( color.rgb );
            float f = smoothstep(.5 * c, c, l);
            f = smoothstep(0., .5, f);
            vec3 col = vec3(f);
            gl_FragColor = vec4(col, color.a);
        }`,

        sliceFragment: `uniform sampler2D uSampler;
        uniform float slices;
        uniform float offset;
        uniform float tTime;
        uniform float speedV;
        uniform float speedH;
        varying vec2 vTextureCoord;
        
        float steppedVal(float v, float steps){
            return floor(v*steps)/steps;
        }
        
        float random1d(float n){
            return fract(sin(n) * 43758.5453);
        }

        float noise1d(float p){
            float fl = floor(p);
            float fc = fract(p);
            return mix(random1d(fl), random1d(fl + 1.0), fc);
        }
        
        const float TWO_PI = 6.283185307179586;
        void main() {
            vec2 uv = vTextureCoord;
            float n = noise1d(uv.y * slices + tTime * speedV * 3.0);
            float ns = steppedVal(fract(n  ),slices) + 2.0;
            float nsr = random1d(ns);
            vec2 uvn = uv;
            uvn.x += nsr * sin(tTime * TWO_PI + nsr * 20.0) * offset;
            gl_FragColor = texture2D(uSampler, uvn);
        }`,

        duotone: {
            vertex: `#define GLSLIFY 1
            attribute vec2 aVertexPosition;
            attribute vec2 aTextureCoord;
            
            uniform mat3 projectionMatrix;
            varying vec2 vTextureCoord;
            
            void main(void){
                gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
                vTextureCoord = aTextureCoord;
            }`,

            fragment: `#define GLSLIFY 1
            vec3 duotone(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform vec3 highlightColor;
            uniform vec3 shadowColor;
            
            void main(void)
            {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
                gl_FragColor = vec4(duotone(inputImage.rgb, highlightColor, shadowColor), inputImage.a);
            }`
        }
    },

    smoothing: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `#define GLSLIFY 1
        vec3 darkenBlend(vec3 front, vec3 back)
        {
            float r = min(front.r, back.r);
            float g = min(front.g, back.g);
            float b = min(front.b, back.b);
            return vec3(r, g, b);
        }
        
        vec3 overlayBlend(vec3 front, vec3 back)
        {
            return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
        }
        
        vec3 screenBlend(vec3 front, vec3 back)
        {
            return 1.0 - (1.0 - front) * (1.0 - back);
        }
        
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        
        uniform sampler2D blurImage;
        uniform float amount;
        uniform float clampX;
        uniform float clampY;
        
        void main(void)
        {
            vec4 inputImage = texture2D(uSampler, vTextureCoord);
            vec4 bImage = texture2D(blurImage, vTextureCoord * vec2(clampX,clampY));
        
            vec3 subtractScalar = (inputImage.rgb+0.5) - bImage.rgb;
        
            subtractScalar = overlayBlend(1.0 - subtractScalar,inputImage.rgb);
            inputImage.rgb = mix(inputImage.rgb,subtractScalar,amount);
        
            gl_FragColor = inputImage;
        
        }`
    },
    sharpen: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,

        fragment: `precision mediump float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform float w;
        uniform float h;
        uniform float sharpness;

        void main(void) {
            vec2 uv = vTextureCoord;
            
            vec2 step = 1. / vec2(w, h);
            vec3 texA = texture2D(uSampler, uv + vec2(-step.x, -step.y) * 1.5 ).rgb;
            vec3 texB = texture2D(uSampler, uv + vec2( step.x, -step.y) * 1.5 ).rgb;
            vec3 texC = texture2D(uSampler, uv + vec2(-step.x,  step.y) * 1.5 ).rgb;
            vec3 texD = texture2D(uSampler, uv + vec2( step.x,  step.y) * 1.5 ).rgb;
        
            vec3 around = 0.25 * (texA + texB + texC + texD);
            vec3 center  = texture2D(uSampler, uv).rgb;
            
            vec3 col = center + (center - around) * sharpness;
            
            gl_FragColor = vec4(col,1.);
        }`
    },
    oldPhoto: {
        defaultVertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
        }`,
        1: {
            fragment: `#define GLSLIFY 1
            float smoothThresholdLeg(vec3 inpImg, float thresholdAmount, float smoothness)
            {
                vec3 Lum = vec3(0.2125, 0.7154, 0.0721);
                float luminance = dot(inpImg, Lum);
                float thresholdResult = smoothstep(max(thresholdAmount-smoothness,0.0),min(thresholdAmount+smoothness,1.0),luminance);
                return thresholdResult;
            
            }
            
            vec3 duotone_1(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec3 genNoise(vec2 coord, vec3 color1, vec3 color2)
            {
                float noise;
                float a = 12.9898;
                float c = 151.7182;
                float d = 43758.5453;
                float dt= dot(coord ,vec2(a,c));
                float sn= mod(dt,3.14);
                float result = fract(sin(sn) * d);
                return duotone_1(vec3(result),color1,color2);
            }
            
            vec3 duotone_0(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec3 duotone_2(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            float hash(vec2 n)
            {
                return fract(cos(dot(n,vec2(36.26,73.12)))*354.63);
            }
            float noise_0(vec2 n)
            {
                vec2 fn = floor(n);
                vec2 sn = smoothstep(vec2(0),vec2(1),fract(n));
            
                float h1 = mix(hash(fn),hash(fn+vec2(1,0)),sn.x);
                float h2 = mix(hash(fn+vec2(0,1)),hash(fn+vec2(1)),sn.x);
                return mix(h1,h2,sn.y);
            }
            vec3 perlinNoise(vec2 n, float amount,vec3 noiseColor, vec3 backColor)
            {
                n /= amount;
                float total;
                total = noise_0(n/32.)*0.5875+noise_0(n/16.)*0.2+noise_0(n/8.)*0.1
                        +noise_0(n/4.)*0.05+noise_0(n/2.)*0.025+noise_0(n)*0.0125;
                 return duotone_2(vec3(total),noiseColor,backColor);
            }
            
            vec2 mapCoord( vec2 coord, vec4 filterA )
            {
                coord *= filterA.xy;
                coord += filterA.zw;
            
                return coord;
            }
            
            varying vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            //uniform sampler2D textureSampler;
            uniform float grain_amount;
            uniform float silhouette_amount;
            uniform vec4 filterArea;
            
            void main(void)
            {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
            
                if (inputImage.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                inputImage.rgb /= inputImage.a;
            
                vec2 uv = mapCoord(vTextureCoord,filterArea);
                vec3 perlinN = perlinNoise(uv,grain_amount,vec3(0.8),vec3(0.2));
                vec3 duoToneImg = duotone_0(perlinN, vec3(0.42, 0.34, 0.24), vec3(0.84, 0.71, 0.50));
            
                vec3 sThreshold = vec3(smoothThresholdLeg(inputImage.rgb,silhouette_amount/255.0,0.3));
            
                gl_FragColor = vec4(vec3(duoToneImg * sThreshold)*inputImage.a, inputImage.a);
            }`
        },
        2: {
            fragment: `#define GLSLIFY 1
            vec3 duotone_1(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec3 genNoise(vec2 coord, vec3 color1, vec3 color2)
            {
                float noise;
                float a = 12.9898;
                float c = 151.7182;
                float d = 43758.5453;
                float dt= dot(coord ,vec2(a,c));
                float sn= mod(dt,3.14);
                float result = fract(sin(sn) * d);
                return duotone_1(vec3(result),color1,color2);
            }
            
            vec3 duotone_2(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            float colorBurnBlendF(float front, float back)
            {
                //return 1.0 - (1.0 - back) / front;
                return (((2.0 * front) == 0.0) ? (2.0 * front) : max((1.0 - ((1.0 - back) / (2.0 * front))), 0.0));
            }
            
            vec3 colorBurnBlend(vec3 front, vec3 back)
            {
                //return 1.0 - (1.0 - back) / front;
                //return (((2.0 * blend) == 0.0) ? (2.0 * blend) : max((1.0 - ((1.0 - base) / (2.0 * blend))), 0.0));
                  vec3 result;
                    result.r = colorBurnBlendF(front.r,back.r);
                    result.g = colorBurnBlendF(front.g,back.g);
                    result.b = colorBurnBlendF(front.b,back.b);
                    return result;
            }
            
            float hardLightBlendF(float front, float back)
            {
                return (front < 0.5) ? 2.0 * front * back : 1.0 - 2.0 * (1.0 - front) * (1.0 - back);
            }
            
            vec3 hardLightBlend(vec3 front,vec3 back)
            {
                vec3 result;
                result.r = hardLightBlendF(front.r,back.r);
                result.g = hardLightBlendF(front.g,back.g);
                result.b = hardLightBlendF(front.b,back.b);
                return result;
            }
            
            vec3 duotone_0(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            float hash(vec2 n)
            {
                return fract(cos(dot(n,vec2(36.26,73.12)))*354.63);
            }
            float noise_0(vec2 n)
            {
                vec2 fn = floor(n);
                vec2 sn = smoothstep(vec2(0),vec2(1),fract(n));
            
                float h1 = mix(hash(fn),hash(fn+vec2(1,0)),sn.x);
                float h2 = mix(hash(fn+vec2(0,1)),hash(fn+vec2(1)),sn.x);
                return mix(h1,h2,sn.y);
            }
            vec3 perlinNoise(vec2 n, float amount,vec3 noiseColor, vec3 backColor)
            {
                n /= amount;
                float total;
                total = noise_0(n/32.)*0.5875+noise_0(n/16.)*0.2+noise_0(n/8.)*0.1
                        +noise_0(n/4.)*0.05+noise_0(n/2.)*0.025+noise_0(n)*0.0125;
                 return duotone_0(vec3(total),noiseColor,backColor);
            }
            
            vec2 mapCoord( vec2 coord, vec4 filterA )
            {
                coord *= filterA.xy;
                coord += filterA.zw;
            
                return coord;
            }
            
            varying vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            //uniform sampler2D textureSampler;
            uniform vec4 filterArea;
            
            void main(void)
            {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
            
                if (inputImage.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                inputImage.rgb /= inputImage.a;
            
                vec3 bwmode1 = inputImage.ggg;
            
                vec2 uv = mapCoord(vTextureCoord,filterArea);
                vec3 perlinNoiseImg = perlinNoise(uv,4.0,vec3(1.0),vec3(0.7));
                vec3 cbBlend = colorBurnBlend(inputImage.rgb, perlinNoiseImg);
            
                //use normal noise
                vec3 noiseImg = genNoise(vTextureCoord,vec3(0.73),vec3(0.15));
                vec3 hardBlend = hardLightBlend(bwmode1, noiseImg);
            
                hardBlend = hardLightBlend(cbBlend,hardBlend);
            
                gl_FragColor = vec4(vec3(hardBlend.b)*inputImage.a, inputImage.a);
            }`
        },
        3: {
            fragment: `#define GLSLIFY 1
            float smoothThresholdLeg(vec3 inpImg, float thresholdAmount, float smoothness)
            {
                vec3 Lum = vec3(0.2125, 0.7154, 0.0721);
                float luminance = dot(inpImg, Lum);
                float thresholdResult = smoothstep(max(thresholdAmount-smoothness,0.0),min(thresholdAmount+smoothness,1.0),luminance);
                return thresholdResult;
            
            }
            
            vec3 duotone(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec3 screenBlend(vec3 front, vec3 back)
            {
                return 1.0 - (1.0 - front) * (1.0 - back);
            }
            
            varying vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            uniform sampler2D textureSampler;
            uniform float silhouette_amount;
            
            void main(void)
            {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
            
                if (inputImage.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                inputImage.rgb /= inputImage.a;
            
                vec4 textureImage = texture2D(textureSampler, vTextureCoord);
            
                vec3 sThreshold = vec3(smoothThresholdLeg(inputImage.rgb,silhouette_amount/255.0,0.3));
            
                vec3 duoToneImg = duotone(sThreshold, vec3(0.85, 0.65, 0.41), vec3(0.0));
            
                gl_FragColor = vec4(screenBlend(duoToneImg, textureImage.rgb)*inputImage.a, inputImage.a);
            }`
        },
        4: {
            fragment: `#define GLSLIFY 1
            float smoothThresholdLeg(vec3 inpImg, float thresholdAmount, float smoothness)
            {
                vec3 Lum = vec3(0.2125, 0.7154, 0.0721);
                float luminance = dot(inpImg, Lum);
                float thresholdResult = smoothstep(max(thresholdAmount-smoothness,0.0),min(thresholdAmount+smoothness,1.0),luminance);
                return thresholdResult;
            
            }
            
            vec3 lightenBlend(vec3 front, vec3 back)
            {
                return max(front,back);
            }
            
            float hardLightBlendF(float front, float back)
            {
                return (front < 0.5) ? 2.0 * front * back : 1.0 - 2.0 * (1.0 - front) * (1.0 - back);
            }
            
            vec3 hardLightBlend(vec3 front,vec3 back)
            {
                vec3 result;
                result.r = hardLightBlendF(front.r,back.r);
                result.g = hardLightBlendF(front.g,back.g);
                result.b = hardLightBlendF(front.b,back.b);
                return result;
            }
            
            float getLumo(vec3 c) {
            
                 return dot(c, vec3(0.299, 0.587, 0.114));
            }
            
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform sampler2D textureSampler;
            uniform sampler2D blurSampler;
            uniform float color_amount;
            
            void main(void)
            {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
            
                if (inputImage.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                inputImage.rgb /= inputImage.a;
            
                vec4 textureImage = texture2D(textureSampler, vTextureCoord);
                vec4 blurImage = texture2D(blurSampler, vTextureCoord);
                vec3 bwM3 = vec3(getLumo(inputImage.rgb));
                vec3 hlBlend = hardLightBlend(textureImage.rgb, bwM3);
                vec3 sThreshold = vec3(smoothThresholdLeg(inputImage.rgb,color_amount/255.0,0.4));
            
                gl_FragColor = vec4(lightenBlend(blurImage.rgb, lightenBlend(sThreshold, hlBlend))*inputImage.a, inputImage.a);
            }`
        },
        r: {
            fragment: `varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float m[20];
            uniform float uAlpha;
            
            void main(void)
            {
                vec4 c = texture2D(uSampler, vTextureCoord);
            
                if (uAlpha == 0.0) {
                    gl_FragColor = c;
                    return;
                }
            
                // Un-premultiply alpha before applying the color matrix. See issue #3539.
                if (c.a > 0.0) {
                  c.rgb /= c.a;
                }
            
                vec4 result;
            
                result.r = (m[0] * c.r);
                    result.r += (m[1] * c.g);
                    result.r += (m[2] * c.b);
                    result.r += (m[3] * c.a);
                    result.r += m[4];
            
                result.g = (m[5] * c.r);
                    result.g += (m[6] * c.g);
                    result.g += (m[7] * c.b);
                    result.g += (m[8] * c.a);
                    result.g += m[9];
            
                result.b = (m[10] * c.r);
                   result.b += (m[11] * c.g);
                   result.b += (m[12] * c.b);
                   result.b += (m[13] * c.a);
                   result.b += m[14];
            
                result.a = (m[15] * c.r);
                   result.a += (m[16] * c.g);
                   result.a += (m[17] * c.b);
                   result.a += (m[18] * c.a);
                   result.a += m[19];
            
                vec3 rgb = mix(c.rgb, result.rgb, uAlpha);
            
                // Premultiply alpha again.
                rgb *= result.a;
            
                gl_FragColor = vec4(rgb, result.a);
            }`
        },
        5: {
            fragment: `#define GLSLIFY 1
            float hardLightBlendF(float front, float back)
            {
                return (front < 0.5) ? 2.0 * front * back : 1.0 - 2.0 * (1.0 - front) * (1.0 - back);
            }
            
            vec3 hardLightBlend(vec3 front,vec3 back)
            {
                vec3 result;
                result.r = hardLightBlendF(front.r,back.r);
                result.g = hardLightBlendF(front.g,back.g);
                result.b = hardLightBlendF(front.b,back.b);
                return result;
            }
            
            vec3 gammaAdjust(vec3 inpImage,float amount)
            {
                return pow(inpImage,vec3(amount));
            
            }
            
             vec3 BContrastLeg(vec3 inpImage, float brightness, float contrast) {
                 vec3 brightImage = gammaAdjust(inpImage,brightness);
                 vec3 contrastAm = ((brightImage - 0.5)*contrast)+ 0.5;
                 return contrastAm;
             }
            
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform sampler2D textureSampler;
            uniform float clampX;
            uniform float clampY;
            
            void main(void)
            {
            //
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
            
                if (inputImage.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                inputImage.rgb /= inputImage.a;
            
                vec4 textureImage = texture2D(textureSampler, vTextureCoord * vec2(clampX,clampY));
            
                vec3 bwM1 = inputImage.ggg;
                vec3 adaptiveContrast = BContrastLeg(bwM1,1.0,1.4);
            
                gl_FragColor = vec4(hardLightBlend(adaptiveContrast,textureImage.rgb)*inputImage.a, inputImage.a);
            }`
        },
        6: {
            fragment: `#define GLSLIFY 1
            float smoothThresholdLeg(vec3 inpImg, float thresholdAmount, float smoothness)
            {
                vec3 Lum = vec3(0.2125, 0.7154, 0.0721);
                float luminance = dot(inpImg, Lum);
                float thresholdResult = smoothstep(max(thresholdAmount-smoothness,0.0),min(thresholdAmount+smoothness,1.0),luminance);
                return thresholdResult;
            
            }
            
            vec3 duotone(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            float hardLightBlendF(float front, float back)
            {
                return (front < 0.5) ? 2.0 * front * back : 1.0 - 2.0 * (1.0 - front) * (1.0 - back);
            }
            
            vec3 hardLightBlend(vec3 front,vec3 back)
            {
                vec3 result;
                result.r = hardLightBlendF(front.r,back.r);
                result.g = hardLightBlendF(front.g,back.g);
                result.b = hardLightBlendF(front.b,back.b);
                return result;
            }
            
            varying vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            uniform sampler2D textureSampler;
            uniform float silhouette_amount;
            
            void main(void)
            {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
            
                if (inputImage.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                inputImage.rgb /= inputImage.a;
            
                vec4 textureImage = texture2D(textureSampler, vTextureCoord);
            
                vec3 sThreshold = vec3(smoothThresholdLeg(inputImage.rgb,silhouette_amount/255.0,0.3));
            
                vec3 duoToneImg = duotone(sThreshold, vec3(0.93, 0.68, 0.41), vec3(0.0));
            
                gl_FragColor = vec4(hardLightBlend(duoToneImg, textureImage.rgb)*inputImage.a, inputImage.a);
            }`
        },
        7: {
            fragment: `#define GLSLIFY 1
            vec3 duotone_0(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec3 genNoise(vec2 coord, vec3 color1, vec3 color2)
            {
                float noise;
                float a = 12.9898;
                float c = 151.7182;
                float d = 43758.5453;
                float dt= dot(coord ,vec2(a,c));
                float sn= mod(dt,3.14);
                float result = fract(sin(sn) * d);
                return duotone_0(vec3(result),color1,color2);
            }
            
            vec3 duotone_1(vec3 inpImage, vec3 color1, vec3 color2)
            {
                float v = max(max(inpImage.r, inpImage.g), inpImage.b);
                return color1*v+color2*(1.0-v);
            
            }
            
            vec3 overlayBlend(vec3 front, vec3 back)
            {
                return mix(2.0 * front * back, 1.0 - 2.0 * (1.0 - front) * (1.0-back), step(0.5, back));
            }
            
            vec3 softLightBlend(vec3 front, vec3 back)
            {
                vec3 result;
                result.r = (front.r > 0.5) ? (1.0-(1.0-back.r)*(1.0-(front.r-0.5))) : (back.r * (front.r + 0.5));
                result.g = (front.g > 0.5) ? (1.0-(1.0-back.g)*(1.0-(front.g-0.5))) : (back.g * (front.g + 0.5));
                result.b = (front.b > 0.5) ? (1.0-(1.0-back.b)*(1.0-(front.b-0.5))) : (back.b * (front.b + 0.5));
                return result;
            
            }
            
            varying vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            
            void main(void)
            {
                vec4 inputImage = texture2D(uSampler, vTextureCoord);
            
                if (inputImage.a == 0.0) {
                    gl_FragColor = vec4(0, 0, 0, 0);
                    return;
                }
            
                inputImage.rgb /= inputImage.a;
            
                vec3 noiseImg = genNoise(vTextureCoord,vec3(0.3),vec3(0.6));
                vec3 bwmode2 = inputImage.bbb;
                vec3 duoToneImg = duotone_1(bwmode2, vec3(0.93,0.68,0.41), vec3(0.0));
                //give blur duoToneImg
                //BlurChange(duotone,3,7,7)
                vec3 oBlend = overlayBlend(inputImage.rgb, duoToneImg);
            
                gl_FragColor = vec4(softLightBlend(noiseImg, oBlend)*inputImage.a, inputImage.a);
            }`
        }
    },

    blendModeFilter: {
        vertex: `#define GLSLIFY 1
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        attribute vec4 aColor;
        
        uniform mat3 projectionMatrix;
        uniform mat3 mapMatrix;
        
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        void main(void){
            gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            vTextureCoord = aTextureCoord;
            vMapCoord = (mapMatrix * vec3(aVertexPosition, 1.0)).xy;
        }`,

        normal: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 normalBlend (vec3 front, vec3 back, float opacity){
            return front * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(normalBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        add: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 addBlend (vec3 front, vec3 back, float opacity){
            return (front + back) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
            vec3 Cb = front.rgb/front.a;
            vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(addBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        substract: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 subtractBlend (vec3 front, vec3 back, float opacity){
            return (back - front) * opacity + back * (1.0 - opacity);
            //return (max(src+dst-vec3(1.0),vec3(0.0))) * opacity + src * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(subtractBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        multiply: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 multiplyBlend (vec3 front, vec3 back, float opacity){
            return (front * back) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(multiplyBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        darken: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 darkenBlend (vec3 front, vec3 back, float opacity){
            float r = min(front.r, back.r);
            float g = min(front.g, back.g);
            float b = min(front.b, back.b);
            return vec3(r, g, b) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(darkenBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        color_burn: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 colorBurnBlend (vec3 front, vec3 back, float opacity){
            return vec3((front.x == 0.0) ? 0.0 : (1.0 - ((1.0 - back.x) / front.x)),
                        (front.y == 0.0) ? 0.0 : (1.0 - ((1.0 - back.y) / front.y)),
                        (front.z == 0.0) ? 0.0 : (1.0 - ((1.0 - back.z) / front.z))) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(colorBurnBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        linear_burn: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 linearBurnBlend (vec3 front, vec3 back, float opacity){
            return ((front + back) - 1.0) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(linearBurnBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        lighten: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 lightenBlend (vec3 front, vec3 back, float opacity){
            return max(front, back) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(lightenBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        screen: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 screenBlend (vec3 front, vec3 back, float opacity){
            return ((front + back) - (front * back)) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(screenBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        color_dodge: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 colorDodgeBlend (vec3 front, vec3 back, float opacity){
            return vec3((front.x == 1.0) ? 1.0 : min(1.0, back.x / (1.0 - front.x)),
                        (front.y == 1.0) ? 1.0 : min(1.0, back.y / (1.0 - front.y)),
                        (front.z == 1.0) ? 1.0 : min(1.0, back.z / (1.0 - front.z))) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(colorDodgeBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        
        linear_dodge: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        uniform float clampX;
        uniform float clampY;
        
        vec3 linearDodgeBlend (vec3 front, vec3 back, float opacity){
            return (front + back) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord * vec2(clampX,clampY));
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(linearDodgeBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        overlay: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        uniform int alphadir;
        
        vec3 overlayBlend (vec3 front, vec3 back, float opacity, int alphadirection){
            return vec3((back.x <= 0.5) ? (2.0 * front.x * back.x) : (1.0 - 2.0 * (1.0 - back.x) * (1.0 - front.x)),
                        (back.y <= 0.5) ? (2.0 * front.y * back.y) : (1.0 - 2.0 * (1.0 - back.y) * (1.0 - front.y)),
                        (back.z <= 0.5) ? (2.0 * front.z * back.z) : (1.0 - 2.0 * (1.0 - back.z) * (1.0 - front.z))) * opacity + ((alphadirection == 0) ? back : front) * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
            if(back.a == 0.0  && alphadir == 0){
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
            vec3 Cb = front.rgb/front.a;
            vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(overlayBlend(Cb.xyz, Cs.xyz, intensity, alphadir), 0.0, 1.0);

            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        soft_light: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 softlightBlend (vec3 front, vec3 back, float opacity){
            return vec3((front.x <= 0.5) ? (back.x - (1.0 - 2.0 * front.x) * back.x * (1.0 - back.x)) : (((front.x > 0.5) && (back.x <= 0.25)) ? (back.x + (2.0 * front.x - 1.0) * (4.0 * back.x * (4.0 * back.x + 1.0) * (back.x - 1.0) + 7.0 * back.x)) : (back.x + (2.0 * front.x - 1.0) * (sqrt(back.x) - back.x))),
                        (front.y <= 0.5) ? (back.y - (1.0 - 2.0 * front.y) * back.y * (1.0 - back.y)) : (((front.y > 0.5) && (back.y <= 0.25)) ? (back.y + (2.0 * front.y - 1.0) * (4.0 * back.y * (4.0 * back.y + 1.0) * (back.y - 1.0) + 7.0 * back.y)) : (back.y + (2.0 * front.y - 1.0) * (sqrt(back.y) - back.y))),
                        (front.z <= 0.5) ? (back.z - (1.0 - 2.0 * front.z) * back.z * (1.0 - back.z)) : (((front.z > 0.5) && (back.z <= 0.25)) ? (back.z + (2.0 * front.z - 1.0) * (4.0 * back.z * (4.0 * back.z + 1.0) * (back.z - 1.0) + 7.0 * back.z)) : (back.z + (2.0 * front.z - 1.0) * (sqrt(back.z) - back.z)))) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(softlightBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        hard_light: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 hardlightBlend (vec3 front, vec3 back, float opacity){
            return vec3((front.x <= 0.5) ? (2.0 * front.x * back.x) : (1.0 - 2.0 * (1.0 - front.x) * (1.0 - back.x)),
                        (front.y <= 0.5) ? (2.0 * front.y * back.y) : (1.0 - 2.0 * (1.0 - front.y) * (1.0 - back.y)),
                        (front.z <= 0.5) ? (2.0 * front.z * back.z) : (1.0 - 2.0 * (1.0 - front.z) * (1.0 - back.z))) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(hardlightBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        vivid_light: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 vividlightBlend (vec3 front, vec3 back, float opacity){
        
            return mix(max(vec3(0.0), 1.0 - min(vec3(1.0), (1.0 - back) / (2.0 * front))),
                             min(vec3(1.0), back / (2.0 * (1.0 - front))),
                             step(0.5, front))* opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(vividlightBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        linear_light: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 linearLightBlend (vec3 front, vec3 back, float opacity){
            return (2.0 * front + back - 1.0) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(linearLightBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        pin_light: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 pinlightBlend (vec3 front, vec3 back, float opacity){
            return vec3((front.x > 0.5) ? max(back.x, 2.0 * (front.x - 0.5)) : min(back.x, 2.0 * front.x),
                        (front.x > 0.5) ? max(back.y, 2.0 * (front.y - 0.5)) : min(back.y, 2.0 * front.y),
                        (front.z > 0.5) ? max(back.z, 2.0 * (front.z - 0.5)) : min(back.z, 2.0 * front.z)) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(pinlightBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        difference: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 differenceBlend (vec3 front, vec3 back, float opacity){
            return abs(front - back) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(differenceBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,
        
        exclusion: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        vec3 exclusionBlend (vec3 front, vec3 back, float opacity){
            return (front + back - 2.0 * front * back) * opacity + back * (1.0 - opacity);
        }
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = vec4(0, 0, 0, 0);
                return;
            }
        
             vec3 Cb = front.rgb/front.a;
                vec3 Cs = vec3(0.0);
            if (back.a > 0.0) {
                Cs = back.rgb / back.a;
            }
        
            vec3 colour = clamp(exclusionBlend(Cb.xyz, Cs.xyz, intensity), 0.0, 1.0);
        
            vec4 res;
                res.xyz = (1.0 - front.a) * Cs + front.a * colour;
                res.a = front.a + back.a * (1.0-front.a);
                gl_FragColor = vec4(res.xyz * res.a, res.a);
        
        }`,

        erase: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        
        void main(void){
        
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            if (front.a == 0.0) {
                gl_FragColor = back;
                return;
            }
        
            back.a = clamp((back.a - (front.a * intensity)), 0.0, 1.0);
        
            gl_FragColor = back;
        
        }`,
        
        alpha: `#define GLSLIFY 1
        varying vec2 vTextureCoord;
        varying vec2 vMapCoord;
        uniform sampler2D uSampler;
        uniform sampler2D iChannel1;
        
        uniform float intensity;
        void main(void){
            vec4 back = texture2D(uSampler, vTextureCoord);
            vec4 front = texture2D(iChannel1, vTextureCoord);
        
            float alpha = clamp((front.a * intensity), 0.0, 1.0);
        
            back.rgb *= alpha;
            back.a = alpha;
        
            gl_FragColor = back;
        }`
    },

    flipShader: `#define GLSLIFY 1
    varying vec2 vTextureCoord;
    varying vec2 vMapCoord;

    uniform bool flipX;
    uniform bool flipY;
    uniform sampler2D uSampler;

    void main(void){
        vec2 textureCoords = vTextureCoord;

        if(flipX) {
            textureCoords.x = 1.0 - vTextureCoord.x;
        }
        
        if(flipY) {
            textureCoords.y = 1.0 - vTextureCoord.y;
        }

        gl_FragColor = texture2D(uSampler, textureCoords);
    
    }`
};
