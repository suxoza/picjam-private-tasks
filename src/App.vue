<template>
  <!-- <Colours /> -->

  <div class="w-full items-center justify-start h-16 bg-gray-100 flex gap-x-10 px-10 text-lg">
    <div @click="active_component = 'Colours'" class="cursor-pointer hover:underline" :class="[active_component == 'Colours'?'text-blue-800 underline':' text-gray-800']">Colours</div>
    <div @click="active_component = 'Cleaner'" class="cursor-pointer hover:underline" :class="[active_component == 'Cleaner'?'text-blue-800 underline':' text-gray-800']">Cleaner</div>
  </div>
  
  <component :is="active_component" />
  
</template>



<script>  
    import Colours from './components/Colours.vue'
    import Cleaner from './components/Cleaner.vue'    
    import { ref } from 'vue'
    export default {
      components: {
        Colours,
        Cleaner
      },
      setup() {
        const active_component = ref('Colours')
        return {
          active_component
        }

      }
    }
    

</script>
