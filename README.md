# gbtlite

## Visualize metagenomes in a web browser

View coverage-GC plots of metagenome assemblies in your web browser with `gbtlite`. These plots are useful in quality control of metagenomic data, and in guiding the binning of individual genomes from metagenomes.

`gbtlite` implements these visualizations using the [D3.js library](http://d3js.org). 

<a href="https://kbseah.github.io/gbtlite/">Try it out here!</a> 

If you find this useful, consider trying the full [`gbtools` package for R](https://github.com/kbseah/genome-bin-tools), which allows selection and manipulation of bins, in addition to visualization.

## Instructions

Prepare your data for plotting. You need to have a metagenome assembly and the raw reads used to make that assembly. Calculate the coverage statistics for the assembly by mapping the reads to the assembly with bbmap.sh.

The input, like for `gbtools`, is the "covstats" output from bbmap.sh, which contains the coverage statistics for each contig in an assembly. You'll have to manually (sorry) remove the `#` character from the header line of the file before feeding it to `gbtlite`.

Refer to the `gbtools` manual for [instructions and example commands](https://github.com/kbseah/genome-bin-tools/wiki/1.-Produce-and-annotate-metagenomic-assembly) (only step 1a is necessary for `gbtlite`).

## Citations and further reading

* GC-coverage plots - Kumar et al. 2013. [Blobology: exploring raw genome data for contaminants, symbionts and parasites using taxon-annotated GC-coverage plots](http://journal.frontiersin.org/article/10.3389/fgene.2013.00237/abstract). Frontiers in Genetics 4. doi: 10.3389/fgene.2013.00237
* Genome binning with coverage data - Albersten et al. 2013. [Genome sequences of rare, uncultured bacteria obtained by differential coverage binning of multiple metagenomes](http://www.nature.com/nbt/journal/v31/n6/abs/nbt.2579.html). Nature Biotechnology 31: 533-538.
* `gbtools` for R - Seah & Gruber-Vodicka 2015. [gbtools: Interactive visualization of metagenome bins in R](http://journal.frontiersin.org/article/10.3389/fmicb.2015.01451/full). Frontiers in Microbiology 6. doi: 10.3389/fmicb.2015.01451

## Contact

Brandon Seah - kbseah@mpi-bremen.de

Please report bugs etc. with the GitHub issues tracker 