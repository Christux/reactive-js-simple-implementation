import { Observable, Observer, Subject, Subscription } from './reactive.js';
import { of, from, range } from './reactiveObject.js';

const btn1 = document.getElementById('btn1');
const btn2 = document.getElementById('btn2');
const btn3 = document.getElementById('btn3');
const btn4 = document.getElementById('btn4');
const lp = document.getElementById('lp');

const observer = {
  next: o => console.log(o),
  complete: () => console.log('complete')
};

// Observable.prototype.half = function () {
//   var delivery = true;
//   return this.filter(o => delivery = !delivery);
// };

// const obs$ = Observable.fromEvent(btn1, 'click').map(_ => 1)
//   .merge(
//     Observable.fromEvent(btn2, 'click').map(_ => 2),
//     Observable.fromEvent(btn3, 'click').map(_ => 3),
//     Observable.fromEvent(btn4, 'click').map(_ => 4)
//   )
//   .map(o => 'B'+o)
//   .do(o => lp.innerText = o)
//   //.take(5);

const obs$ = range(2,8)
  .filter(o=>o%2===0)
  .take(3)
  .map(o=>o*2);

// //const obs$ = Observable.interval(1000).take(10);

obs$.subscribe(observer);

