<template>
  <!-- <Colours /> -->

  <div class="w-full items-center justify-start h-16 bg-gray-100 flex gap-x-10 px-10 text-lg">
    <div @click="active_component = 'Colours'" class="cursor-pointer hover:underline" :class="[active_component == 'Colours'?'text-blue-800 underline':' text-gray-800']">Colours</div>
    <div @click="active_component = 'ColoursNew'" class="cursor-pointer hover:underline" :class="[active_component == 'ColoursNew'?'text-blue-800 underline':' text-gray-800']">Colours-New</div>
    <div @click="active_component = 'ColoursNew2'" class="cursor-pointer hover:underline" :class="[active_component == 'ColoursNew2'?'text-blue-800 underline':' text-gray-800']">Colours-New2</div>
    <div @click="active_component = 'Cleaner'" class="cursor-pointer hover:underline" :class="[active_component == 'Cleaner'?'text-blue-800 underline':' text-gray-800']">Cleaner</div>
    <div @click="active_component = 'CleanerLama'" class="cursor-pointer hover:underline" :class="[active_component == 'CleanerLama'?'text-blue-800 underline':' text-gray-800']">Cleaner Lama</div>
    <div @click="active_component = 'ColoursPixi'" class="cursor-pointer hover:underline" :class="[active_component == 'ColoursPixi'?'text-blue-800 underline':' text-gray-800']">Cleaner PIXI</div>
  </div>
  
  <component :is="active_component" />
  
</template>



<script>  
    import Colours from './components/Colours.vue'
    import Cleaner from './components/Cleaner.vue'    
    import CleanerLama from './components/CleanerLama.vue'    
    import ColoursNew from './components/ColoursNew.vue'    
    import ColoursNew2 from './components/ColoursNew2.vue'    
    import ColoursPixi from './components/ColoursPixi.vue'    
    import { ref } from 'vue'
    export default {
      components: {
        Colours,
        Cleaner,
        CleanerLama,
        ColoursNew,
        ColoursNew2,
        ColoursPixi,
      },
      setup() {
        const active_component = ref('ColoursPixi')
        return {
          active_component
        }

      }
    }
    

</script>
