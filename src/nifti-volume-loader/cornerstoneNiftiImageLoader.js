import { fetchAndAllocateNiftiVolume } from './helpers';

export default function cornerstoneNiftiImageVolumeLoader(volumeId){
  const niftiVolumePromise = fetchAndAllocateNiftiVolume(volumeId);

  return {
    promise: niftiVolumePromise,
    cancel: () => {
    },
  };
}
