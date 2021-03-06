import React, { useEffect, useRef, useState } from "react";
const fft = require("fft-js").fft;
const fftUtil = require("fft-js").util;
const autocorrelation = require("autocorrelation").autocorrelation;

function getMonvingAverage(period: number) {
  const arr: number[] = [];
  let sum = 0;
  return (value: number) => {
    sum += value;
    arr.push(value);
    if (arr.length >= period) {
      sum -= arr[0];
      arr.shift();
    }
    if (arr.length < period / 2) return 0;
    return sum / arr.length;
  };
}

function getautoCo(arr: Uint8Array, period: number) {
  const result: number[] = [];

  //   for (let i = 0; i <= period; i++) {
  //     let sum = 0;
  //     for (let j = 0; j < arr.length - i; j++) {
  //       sum += arr[j] * arr[j + i];
  //     }
  //     result[i] = sum;
  //   }
  //   if (result[0] < 1.0) result[0] = 1.0;
  //   return result;

  const autoco: number[] = autocorrelation(arr);
  for (let i = 0; i <= period; i++) result.push(autoco[i]);
  return result;
}

function durbinLevinson(r: number[]) {
  const a = Array.from({ length: r.length }, () => {
    return Array.from({ length: r.length }, () => 0);
  });
  const k: number[] = [];
  const e: number[] = [];
  const result: number[] = [];

  e[0] = r[0];
  for (let i = 1; i < r.length; i++) {
    let sum = 0;
    for (let j = 1; j <= i - 1; j++) {
      sum += a[j][i - 1] * r[i - j];
    }
    k[i] = (r[i] - sum) / e[i - 1];
    a[i][i] = k[i];
    for (let j = 0; j <= i - 1; j++) {
      a[j][i] = a[j][i - 1] - k[i] * a[i - j][i - 1];
    }
    e[i] = (1 - k[i] * k[i]) * e[i - 1];
  }
  a.forEach((arr) => {
    result.push(arr[r.length - 1]);
  });
  return result;
}

function LPC(target: Uint8Array, a: number[]) {
  const period = a.length - 1;
  return target.map((value, n) => {
    if (n < period) {
      return value;
    } else {
      return a.reduce((acc, cur, p) => {
        if (p === 0) return acc;
        else return acc + target[n - p] * cur;
      }, 0);
    }
  });
}
interface Formant {
  label: string;
  array: number[];
  Image: HTMLImageElement | null;
}

const formants: Formant[] = [
  {
    label: "???",
    array: [],
    Image: null,
  },
  {
    label: "???",
    array: [],
    Image: null,
  },
  {
    label: "???",
    array: [],
    Image: null,
  },
  {
    label: "???",
    array: [],
    Image: null,
  },
  {
    label: "???",
    array: [],
    Image: null,
  },
];

interface VowelInputProps {
  vowel: string;
  setVowels: (arg0: number[]) => void;
  smad: number[];
}

function VowelInput(props: VowelInputProps) {
  const [isShow, setIsShow] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetClick = () => {
    props.setVowels([]);
  };
  const doneClick = () => {
    console.log(props.smad);
    props.setVowels([...props.smad]);
  };
  const showClick = () => {
    setIsShow(!isShow);
  };
  useEffect(() => {
    if (canvasRef.current && isShow) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const animationCb = () => {
        formants.forEach((value) => {
          if (value.label === props.vowel) {
            value.array.forEach((val, idx) => {
              ctx.beginPath();
              ctx.moveTo(idx, canvas.clientHeight);
              ctx.lineTo(idx, canvas.clientHeight - val);
              ctx.stroke();
            });
          }
        });
        requestAnimationFrame(animationCb);
      };
      requestAnimationFrame(animationCb);
    }
  });

  return (
    <>
      {isShow ? (
        <canvas
          style={{ border: "1px solid black" }}
          width={1024}
          height={190}
          ref={canvasRef}
        ></canvas>
      ) : null}
      <div>
        {props.vowel}
        <button onClick={resetClick}>reset</button>
        <button onClick={doneClick}>done</button>
        <button onClick={showClick}>show</button>
      </div>
    </>
  );
}
let lastImage: HTMLImageElement | null = null;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smad: number[] = [];

  const getSetVowels = (idx: number) => {
    return (arg0: number[]) => {
      formants[idx].array = arg0;
    };
  };

  const onClick = () => {
    console.log(formants);
  };

  formants.forEach((value) => {
    value.Image = new Image();
    value.Image.src = `./vowels/${value.label}.png`;
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");

    const canvas = canvasRef.current;
    if (!ctx) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        console.log(audioContext.sampleRate);
        analyser.smoothingTimeConstant = 0.6;
        analyser.fftSize = 2048; //
        const byteFrequencyDataArray = new Uint8Array(
          analyser.frequencyBinCount / 3
        );

        const callback = () => {
          ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

          analyser.getByteFrequencyData(byteFrequencyDataArray);

          const sma = getMonvingAverage(16);
          smad.length = 0;
          byteFrequencyDataArray.forEach((value) => {
            smad.push(sma(value));
          });

          smad.forEach((value, idx) => {
            ctx.beginPath();
            ctx.moveTo(idx, canvas.clientHeight);
            ctx.lineTo(idx, canvas.clientHeight - value);
            ctx.stroke();
          });

          const candidates = formants.map((value) => {
            let vowelsSelfDist = 0;
            const dot = value.array.reduce((acc, cur, idx) => {
              vowelsSelfDist += cur * cur;
              return acc + cur * smad[idx];
            }, 0);
            const smadSelfDist = smad.reduce((acc, cur) => {
              return acc + cur * cur;
            }, 0);
            const similarity =
              dot / (Math.sqrt(vowelsSelfDist) * Math.sqrt(smadSelfDist));
            return {
              vowel: value.label,
              similarity: similarity,
              image: value.Image,
              distPercent: smadSelfDist / vowelsSelfDist,
            };
          });

          candidates.sort((a, b) => b.similarity - a.similarity);
          ctx.font = "24px selif";
          if (
            candidates[0].similarity > 0.9 &&
            candidates[0].distPercent > 0.5
          ) {
            ctx.fillText(
              `${(candidates[0].similarity * 100).toFixed(1)}% "${
                candidates[0].vowel
              }" p : ${candidates[0].distPercent.toFixed(1)}`,
              550,
              50
            );
            lastImage = candidates[0].image;
          } else {
            ctx.fillText("None", 550, 50);
          }
          if (lastImage && candidates[0].distPercent > 0.3)
            ctx.drawImage(lastImage, 300, 0);
          requestAnimationFrame(callback);
        };
        requestAnimationFrame(callback);
      })
      .catch((error) => console.log(error));
  }, []);

  return (
    <>
      {formants.map((value, idx) => {
        const setVowels = (arg0: number[]) => {
          formants[idx].array = arg0;
        };
        return (
          <VowelInput
            vowel={value.label}
            setVowels={setVowels}
            smad={smad}
          ></VowelInput>
        );
      })}
      <canvas
        style={{ border: "1px solid black" }}
        width={1024}
        height={300}
        ref={canvasRef}
      ></canvas>
      <button onClick={onClick}>console</button>
    </>
  );
}

export default App;
