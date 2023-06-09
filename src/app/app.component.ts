import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {
  ActiveElement,
  Chart, ChartEvent, ChartType,
  LinearScale,
  LineElement,
  PointElement, ScatterController, TimeScale, Tooltip
} from 'chart.js';
import 'src/assets/vendor/chartjs/chartjs-plugin-dragdata';
import 'chartjs-adapter-moment';
import * as moment from "moment";

interface LightSpectrum {
  title: string;
  color: string;
  default?: boolean;
}

Chart.register(LineElement);
Chart.register(LinearScale);
Chart.register(PointElement);
Chart.register(ScatterController);
Chart.register(TimeScale);
Chart.register(Tooltip);

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType = ChartType> {
    dragData?: {
      round?: number,
      showTooltip?: boolean,
      dragX?: boolean,
      onDrag: Function,
      onDragEnd: Function
    }
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('deleteConfirm') deleteConfirmPopup!: ElementRef<HTMLDivElement>;

  chart!: Chart<"bar" | "line" | "scatter" | "bubble" | "pie" | "doughnut" | "polarArea" | "radar", ({ x: string; y: number } | { x: number; y: number } | { x: number; y: number } | { x: number; y: number } | { x: number; y: number } | { x: number; y: number } | { x: number; y: number } | { x: number; y: number } | { x: number; y: number })[], unknown>;

  dataSets: any[] = [];
  lightSpectrum: LightSpectrum[] = [];
  selectedLightSpectrumIndex!: number;
  selectedPoint: { datasetIndex: number, index: number } = {datasetIndex: -1, index: -1};

  ngOnInit(): void {
    this.lightSpectrum.push({title: 'none', color: '#ffffff', default: true});
    this.selectedLightSpectrumIndex = 0;
    this.attachLightSpectrum();
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  createChart(): void {
    const todayEOD = new Date();
    todayEOD.setHours(23, 59, 59);
    const todayST = new Date();
    todayST.setHours(0, 0, 0);
    const startDate = moment(todayST, moment.ISO_8601).format("HH:mm:ss"); // Start date and time for x-axis
    const endDate = moment(todayEOD, moment.ISO_8601).format("HH:mm:ss");
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.chart = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: this.dataSets
        },
        options: {
          onHover(event: ChartEvent, elements: ActiveElement[], chart: Chart) {
            const elem = (event.native?.target as HTMLElement);
            if (elements.length > 0) {
              if (elem) {
                elem.style.cursor = 'pointer';
              }
            } else {
              if (elem) {
                elem.style.cursor = 'default';
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                parser: 'HH:mm:ss',
                unit: 'hour',
                displayFormats: {
                  hour: 'HH:mm:ss'
                },
              },
              ticks: {
                maxRotation: 0, // Rotate labels up to 90 degrees
                minRotation: 0,
                crossAlign: 'far',
                callback: function (value, index, values) {
                  if (index > 0 && (index === values.length - 1 || index % 2 === 0)) {
                    return moment(value).format("HH:mm:ss");
                  } else {
                    return '';
                  }
                }
              },
              title: {
                display: true,
                text: 'Time',
                font: {size: 16}
              },
              min: startDate,
              max: endDate,
            },
            y: {
              type: 'linear',
              position: 'left',
              suggestedMin: 0,
              suggestedMax: 100,
              beginAtZero: true,
              title: {
                display: true,
                text: 'Intensity',
                font: {size: 16}
              },
            }
          },
          plugins: {
            dragData: {
              dragX: true,
              onDrag: function (e: any, datasetIndex: number, index: number, value: any) {
                e.target.style.cursor = 'grabbing'
              },
              onDragEnd: function (e: any, datasetIndex: number, index: number, value: any) {
                e.target.style.cursor = 'default'
              }
            },
            tooltip: {
              callbacks: {
                title: function (context) {
                  return moment(context[0].parsed.x).format('HH:mm:ss');
                },
                label: function (context) {
                  return context.parsed.y.toFixed(2);
                }
              }
            },
          }
        }
      });
    }
    if (this.chart.config.options)
      this.chart.config.options['onClick'] = (event: ChartEvent, elements: ActiveElement[], chart: Chart): void => {
        if (elements.length == 0) {
          this.dataSets[this.selectedLightSpectrumIndex].data.push(
            {
              x: moment(chart.scales['x'].getValueForPixel(event.x || 0)).format('HH:mm:ss'),
              y: chart.scales['y'].getValueForPixel(event.y || 0),
            }
          );
          this.chart.update('none');
        } else {
          this.selectedPoint.datasetIndex = elements[0].datasetIndex;
          this.selectedPoint.index = elements[0].index;

          this.deleteConfirmPopup.nativeElement.style.left = event.x + 'px';
          this.deleteConfirmPopup.nativeElement.style.top = event.y + 'px';
          this.deleteConfirmPopup.nativeElement.classList.add('d-block');
        }
      }
  }

  addLight(): void {
    this.lightSpectrum.push({title: '', color: '#000000'});
    this.selectedLightSpectrumIndex = this.lightSpectrum.length - 1;
    this.attachLightSpectrum();
    this.chart.update();
  }

  removeLightSpectrum(index: number): void {
    this.lightSpectrum.splice(index, 1);
    this.dataSets.splice(index, 1);
    this.chart.update('none');
  }

  selectLightSpectrum(index: number): void {
    this.selectedLightSpectrumIndex = index;
  }

  private attachLightSpectrum(): void {
    const lightSpectrum = this.lightSpectrum[this.selectedLightSpectrumIndex];
    this.dataSets.push({
      data: [],
      label: '',
      backgroundColor: lightSpectrum.color,
      borderColor: lightSpectrum.color,
      borderWidth: 1,
      pointRadius: 6,
      pointHoverRadius: 6,
      pointClickRadius: 6,
      showLine: true
    });
  }

  change(): void {
    const lightSpectrum = this.lightSpectrum[this.selectedLightSpectrumIndex];
    const dataSet = this.dataSets[this.selectedLightSpectrumIndex];
    dataSet.backgroundColor = lightSpectrum.color;
    dataSet.borderColor = lightSpectrum.color;
    this.chart.update('none');
  }

  deletePoint(): void {
    this.hideDeletePopup();
    if (this.selectedPoint) {
      this.dataSets[this.selectedPoint.datasetIndex]?.data.splice(this.selectedPoint.index, 1);
      this.chart.update('none');
    }
  }

  hideDeletePopup(): void {
    this.deleteConfirmPopup.nativeElement.classList.remove('d-block');
  }
}
