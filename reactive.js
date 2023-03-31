/**
 * Simple implementation of reactive patterns with examples
 * 
 * Author: Christophe Rubeck
 * Date: 10/06/2018
 */

'use strict';

/************
 * Observer *
 ************/

function Observer(handlers) {

  this.next = function (value) {
    if (handlers.next) {
      handlers.next(value);
    }
  };

  this.error = function (error) {
    if (handlers.error) {
      handlers.error(error);
    }
  };

  this.complete = function () {
    if (handlers.complete) {
      handlers.complete();
    }
  };
}


/***********
 * Subject *
 ***********/

function Subject() {

  var observers = [];

  this.next = function (value) {
    observers.forEach(function (observer) {
      observer.next(value);
    });
  };

  this.error = function (err) {
    observers.forEach(function (observer) {
      observer.error(err);
    });
  };

  this.complete = function () {
    observers.forEach(function (observer) {
      observer.complete();
    });
  };

  this.asObservable = function () {
    return new Observable(function (obs) {
      return subscribe(obs);
    });
  };

  this.subscribe = function (obs) {
    return subscribe(obs);
  };

  function subscribe(obs) {
    var observer = new Observer(obs);
    observers.push(observer);

    return new Subscription(function dispose() {
      observers = observers.filter(function (obs) {
        return obs !== observer;
      });
    });
  }
}


/**************
 * Observable *
 **************/

function Observable(subscribe) {
  this.subscribe = subscribe;
}


/****************
 * Subscription *
 ****************/

function Subscription(dispose) {
  this.dispose = dispose;
}


/**********************
 * Creation functions *
 **********************/

/**
 * Creates an empty stream
 * 
 * ------------------>
 */
Observable.empty = function () {
  var isdisposed = false;

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    observer.complete();

    return new Subscription(function () {
      if (!isdisposed) {
        isdisposed = true;
        console.log('Empty disposed');
      }
    });
  });
};

/**
 * Creates an one valued stream
 * 
 * of(5)
 * 
 * -5-|------------------> 
 */
Observable.of = function (value) {

  var isdisposed = false;

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    setTimeout(function () {
      observer.next(value);
      observer.complete();
    }, 0);

    return new Subscription(function () {
      if (!isdisposed) {
        isdisposed = true;
        console.log('Of disposed');
      }
    });
  });
};

/**
 * Creates a stream from an array
 * 
 * from([3,8,5,1])
 * 
 * -3-8-5-1-|--------> 
 */
Observable.from = function (values) {

  var isdisposed = false;

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    setTimeout(function () {

      values.forEach(function (value) {
        if (!isdisposed) observer.next(value);
      });

      if (!isdisposed) observer.complete();
    }, 0);

    return new Subscription(function () {
      if (!isdisposed) {
        isdisposed = true;
        console.log('From disposed');
      }
    });
  });
};

/**
 * Creates a stream from a range
 * 
 * range(4,8)
 * 
 * -4-5-6-7-8-|--->
 */
Observable.range = function (min, max) {

  var values = [];

  for (var i = min; i <= max; i++) {
    values.push(i);
  }
  return Observable.from(values);
}

/**
 * Creates a stream from interval
 * 
 * -0-1-2-3-4-5-6----->
 */
Observable.interval = function (period) {

  var intervalHandler;
  var isdisposed = false;

  return new Observable(function (obs) {

    var observer = new Observer(obs);
    var i = 0;

    intervalHandler = setInterval(function () {
      observer.next(i);
      i++;
    }, period);

    return new Subscription(function () {
      if (!isdisposed) {
        clearInterval(intervalHandler);
        console.log('Interval disposed');
        isdisposed = true;
      }
    });
  });
};


/**
 * Creates a stream from an event
 */
Observable.fromEvent = function (element, eventName) {

  var eventHandler;
  var isdisposed = false;

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    eventHandler = function (event) {
      observer.next(event)
    }

    element.addEventListener(eventName, eventHandler);

    return new Subscription(function () {

      if (!isdisposed) {
        element.removeEventListener(eventName, eventHandler);
        console.log('FromEvent disposed');
        isdisposed = true;
      }
    });
  });
}

/************************
 * Observable operators *
 ************************/

/**
 * Takes n first values then disposes the source observable
 * 
 * 0-1-2-3-4-5--->
 * 
 *   take(3)
 * 
 * 0-1-2-|------->
 * 
 */
Observable.prototype.take = function (n) {

  var source = this;

  return new Observable(function (obs) {

    var observer = new Observer(obs);
    var i = 0;

    var subscription = source.subscribe(new Observer({

      next: function (value) {

        if (i < n - 1) {
          observer.next(value);
        }

        if (i === n - 1) {
          observer.next(value);
          observer.complete();
          subscription.dispose();
        }

        i++;
      },
      error: function (err) {
        observer.error(err);
      },
      complete: function () {
        observer.complete();
      }
    }));

    return new Subscription(function () {
      subscription.dispose();
    });
  });
};

/**
 * Filters value from source stream
 * 
 * -5-9-2-7-3-4---->
 * 
 * filter(x -> x > 4)
 *  
 * -5-9---7-------->
 */
Observable.prototype.filter = function (test) {

  var source = this;

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    var subscription = source.subscribe(new Observer({

      next: function (value) {

        if (test(value)) {
          observer.next(value);
        }
      },
      error: function (err) {
        observer.error(err);
      },
      complete: function () {
        observer.complete();
      }
    }));

    return new Subscription(function () {
      subscription.dispose();
    });
  });
};

/**
 * Maps each resulting value from stream
 * 
 * 0-1-2-3-4-5--->
 * 
 * map(x -> x * 2)
 * 
 * 0-2-4-6-8-10--->
 */
Observable.prototype.map = function (map) {

  var source = this;

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    var subscription = source.subscribe(new Observer({

      next: function (value) {
        observer.next(map(value));
      },
      error: function (err) {
        observer.error(err);
      },
      complete: function () {
        observer.complete();
      }
    }));

    return new Subscription(function () {
      subscription.dispose();
    });
  });
};

/**
 * Do something on each value from stream without modifying the stream
 * 
 * 0-1-2-3-4-5--->
 * 
 * do(x -> console.log(x))
 * 
 * 0-1-2-3-4-5--->
 */
Observable.prototype.do = function (next, error, complete) {

  var source = this;

  var toDo = new Observer({
    next: next,
    error: error,
    complete: complete
  });

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    var subscription = source.subscribe(new Observer({

      next: function (value) {
        toDo.next(value);
        observer.next(value);
      },
      error: function (err) {
        toDo.error(err);
        observer.error(err);
      },
      complete: function () {
        toDo.complete();
        observer.complete();
      }
    }));

    return new Subscription(function () {
      subscription.dispose();
    });
  });
};

/**
 * Takes last value of a stream
 * 
 * 0-1-2-3-4-5-|->
 * 
 * takeLast()
 * 
 * ------------5-|->
 */
Observable.prototype.takeLast = function () {

  var source = this;

  return new Observable(function (obs) {

    var observer = new Observer(obs);
    var lastValue;

    var subscription = source.subscribe(new Observer({

      next: function (value) {
        lastValue = value;
      },
      error: function (err) {
        observer.error(err);
      },
      complete: function () {
        observer.next(lastValue);
        observer.complete();
      }
    }));

    return new Subscription(function () {
      subscription.dispose();
    });
  });
};

/**
 * Sums the values of a stream
 * 
 * 0-1-2-3-4-5-->
 * 
 * sum()
 * 
 * 0-1-3-6-10-15-->
 */
Observable.prototype.sum = function () {
  var sum = 0;
  return this.map(function (value) {
    return sum += value;
  });
}

/**
 * Reduces the values of a stream
 * 
 * 0-1-2-3-4-5-|->
 * 
 * reduce()
 * 
 * ------------15-|->
 */
Observable.prototype.reduce = function () {
  return this.sum().takeLast();
}

/**
 * Returns 1 for each value of a stream
 * 
 * 0-1-2-3-4-5-->
 * 
 * uno()
 * 
 * 1-1-1-1-1-1-->
 */
Observable.prototype.uno = function () {
  return this.map(function (value) {
    return 1;
  });
}

/**
 * Counts the number of consumed values of a stream
 * 
 * 10-3-6-2-8-->
 * 
 * tic()
 * 
 * 1-2-3-4-5-->
 */
Observable.prototype.tic = function () {
  return this.uno().sum();
};

/**
 * Merges multiple streams
 * 
 * 3---4---4-|-------->
 * 
 * merge(
 * --2---3---2-|------>,
 * --------------0-|-->
 * )
 * 
 * 3-2-4-3-4-2---0-|->
 */
Observable.prototype.merge = function () {

  var observables = [this];
  for (var i = 0; i < arguments.length; i++) {
    observables.push(arguments[i]);
  }

  var subscriptions = [];
  var completeCount = 0;

  return new Observable(function subscribe(obs) {

    var observer = new Observer(obs);

    observables.forEach(function (source) {
      subscriptions.push(source.subscribe(new Observer({

        next: function (value) {
          observer.next(value);
        },
        error: function (err) {
          observer.error(err);
        },
        complete: function () {
          completeCount++;
          if (completeCount === subscriptions.length) {
            observer.complete();
          }
        }
      })));
    });

    return new Subscription(function dispose() {
      subscriptions.forEach(function (subscription) {
        subscription.dispose();
      });
    });
  });
};

/**
 * Merges all streams emitted by the source stream
 * 
 *  --A---B------------>
 * A: 0------2---|----->
 * B:     ------5---|-->
 * 
 * mergeAll()
 * 
 *  --0------2--5---|-->
 */
Observable.prototype.mergeAll = function () {

  var source = this;

  return new Observable(function (obs) {

    var observer = new Observer(obs);
    var subscriptions = [];
    var completeCount = 0;

    subscriptions.push(source.subscribe(new Observer({

      next: function (observable) {

        subscriptions.push(observable.subscribe(new Observer({
          next: function (value) {
            observer.next(value);
          },
          error: function (err) {
            error(err);
          },
          complete: function () {
            complete();
          }
        })));
      },
      error: function (err) {
        error(err);
      },
      complete: function () {
        complete();
      }
    })));

    return new Subscription(function () {
      subscriptions.forEach(function (subscription) {
        subscription.dispose();
      });
    });

    function error(err) {
      observer.error(err);
    }

    function complete() {
      completeCount++;
      if (completeCount === subscriptions.length) {
        observer.complete();
      }
    }
  });
};

/**
 * Transform values of source bservables into new observables and merges them.
 * 
 * 0-1-|-------->
 * 
 * mergeMap(x -> from([x, x*2]))
 * 
 * 0-0-1-2-|---->
 */
Observable.prototype.mergeMap = function (mergeMap) {
  return this.map(mergeMap).mergeAll();
};

/**
 * Joins all values in a single array
 * 
 * 0-1-2-3-|---->
 * 
 * join()
 * 
 * -------[0,1,2,3]-|->
 */
Observable.prototype.join = function () {

  var source = this;
  var values = [];

  return new Observable(function (obs) {

    var observer = new Observer(obs);

    var subscription = source.subscribe(new Observer({

      next: function (value) {
        values.push(value);
      },
      error: function (err) {
        observer.error(err);
      },
      complete: function () {
        observer.next(values);
        observer.complete();
      }
    }));

    return new Subscription(function () {
      subscription.dispose();
    });
  });
};


export { Observable, Subscription, Observer, Subject };
