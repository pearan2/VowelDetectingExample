import React, { useEffect } from "react";
const FormantAnalyzer = require("formantanalyzer");

function FA() {
  useEffect(() => {
    console.log("useEffect");
    let launch_config = {
      plot_enable: false,
      spec_type: 1, //see below
      output_level: 2, //see below
      plot_len: 200,
      f_min: 50,
      f_max: 4000,
      N_fft_bins: 256,
      N_mel_bins: 128,
      window_width: 25,
      window_step: 15,
      pause_length: 200,
      min_seg_length: 50,
      auto_noise_gate: true,
      voiced_min_dB: 10,
      voiced_max_dB: 100,
      plot_lag: 1,
      pre_norm_gain: 1000,
      high_f_emph: 0.0,
    };
    FormantAnalyzer.configure(launch_config);
    const file_labels: string[] = ["mic"]; //array of labels that will be passed to callback after feature extraction

    const callback = (
      seg_index: any,
      file_labels: any,
      seg_time: any,
      features: any
    ) => {
      //callback function to which extracted features are passed
      console.log("called");
      console.log(features);
    };

    FormantAnalyzer.LaunchAudioNodes(
      3,
      null,
      callback,
      file_labels,
      false,
      false,
      null,
      null
    ).then(() => {
      console.log("done");
    });
  }, []);

  return <div>Hello!</div>;
}

export default FA;
