# What Matters in Practical Learned Image Compression

This repository accompanies the research paper [**"What Matters in Practical Learned Image Compression"**](https://arxiv.org/abs/2605.05148).

**Authors:** Kedar Tatwawadi, Parisa Rahimzadeh, Zhanghao Sun, Zhiqi Chen, Ziyun Yang, Sanjay Nair, Divija Hasteer, Oren Rippel

---

## Overview

We introduce PICO (Perceptual Image Codec), the first learned codec that is both practical, and optimized directly for the human visual system. To derive it, we perform a comprehensive study of modeling choices for practical learned codecs, searching over millions of model configurations to jointly optimize over perceptual quality and on-device runtime.

Based on large-scale subjective user studies, PICO provides 2.3-3× bitrate savings against AV1, AV2, VVC, ECM and JPEG-AI, and 20-40% bitrate savings against the best learned codec alternatives. At the same time, on an iPhone 17, it encodes 12MP images as fast as 230ms, and decodes them in 150ms — faster than most top ML-based codecs run on a V100 GPU. Different from most learned codecs, PICO furthermore comes with cross-platform robustness guarantees.

![Codec comparisons](assets/comparison_figure.png)

The above figure shows comparisons of state-of-the-art traditional and learned codecs. Perceptual BD-rates are based on human ratings from the large-scale subjective study found in the paper. Speed benchmarks on iPhone 17 use identical compiler optimizations.

---

## Interactive Viewer

Visit our [project page](https://apple.github.io/ml-pico/) for an interactive tool that allows you to compare PICO to other codecs side-by-side.

---

## Dataset

We share [here](https://ml-site.cdn-apple.com/datasets/lic/pico.zip) PICO reconstructions on non-PII images in the CLIC 2020 Test Set, across 8 different bitrates. These are the reconstructions directly from the subjective studies reported in the paper.

---

## License

This software and accompanying data have been released under the following licenses:
- Code: [Apple Sample Code License (ASCL)](./LICENSE)
- Data: [CC-BY-NC-ND Deed](./LICENSE_DATA)

---

## Citation

If you find our work useful, please cite:

```bibtex
@article{tatwawadi2026pico,
  title={What Matters in Practical Learned Image Compression},
  author={Tatwawadi, Kedar and Rahimzadeh, Parisa and Sun, Zhanghao and Chen, Zhiqi and Yang, Ziyun and Nair, Sanjay and Hasteer, Divija and Rippel, Oren},
  journal={arXiv preprint arXiv:2605.05148},
  year={2026}
}
```
