import lamejs from 'lamejs';

/**
 * Converts an AudioBuffer into an MP3 Blob using lamejs.
 * Ensures the output is pure MP3.
 */
export async function audioBufferToMp3Blob(audioBuffer: AudioBuffer, kbps: number = 192): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  
  // Use mono or stereo encoder based on audio buffer
  const encoder = new lamejs.Mp3Encoder(channels > 1 ? 2 : 1, sampleRate, kbps);
  const mp3Data: BlobPart[] = [];

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : null;

  // Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
  const leftInt16 = floatToInt16(leftChannel);
  const rightInt16 = rightChannel ? floatToInt16(rightChannel) : null;

  const sampleBlockSize = 1152; // LAME standard block size
  const totalSamples = leftInt16.length;

  for (let i = 0; i < totalSamples; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array;

    if (channels > 1 && rightInt16) {
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf.buffer as ArrayBuffer, mp3buf.byteOffset, mp3buf.byteLength) as unknown as BlobPart);
    }
  }

  // Flush remaining buffer
  const finalChunk = encoder.flush();
  if (finalChunk.length > 0) {
    mp3Data.push(new Uint8Array(finalChunk.buffer as ArrayBuffer, finalChunk.byteOffset, finalChunk.byteLength) as unknown as BlobPart);
  }

  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

function floatToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1.0, 1.0]
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}
