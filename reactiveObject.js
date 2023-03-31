export { of, from, range };


'use strict';

/**************
 * Observable *
 **************/

function observableFactory(subscribeHandler) {

  return (function() {

    var self = this;

    this.take = function(n) {
      return take(self, n);
    };

    this.map = function(mapHandler) {
      return map(self, mapHandler);
    }

    this.filter = function(filterHandler) {
      return filter(self, filterHandler);
    };

    return this;

  }).call({
    subscribe: function (observer) {
      return subscribeHandler(observer);
    }
  });
}


/****************
 * Subscription *
 ****************/

function subscriptionFactory(disposeHandler) {
  return {
    dispose: function () {
      disposeHandler();
    }
  };
}


/************
 * Observer *
 ************/

function observerFactory(handlers) {

  // var handlers;

  // if(typeof handlersOrNext === 'function') {
  //   handlers = {
  //     next: handlersOrNext,
  //     error: error,
  //     complete: complete
  //   };
  // }
  // else {
  //   handlers = handlersOrNext;
  // }

  return {
    next: function (value) {
      if (handlers.next) {
        handlers.next(value);
      }
    },
    error: function (error) {
      if (handlers.error) {
        handlers.error(error);
      }
    },
    complete: function () {
      if (handlers.complete) {
        handlers.complete();
      }
    }
  };
}


/***********
 * Subject *
 ***********/

function subjectFactory() {

  var observers = [];

  return {

    next: function (value) {
      observers.forEach(function (observer) {
        observer.next(value);
      });
    },
    error: function (err) {
      observers.forEach(function (observer) {
        observer.error(err);
      });
    },
    complete: function () {
      observers.forEach(function (observer) {
        observer.complete();
      });
    },
    asObservable: function () {
      return observableFactory(function (obs) {
        return subscribe(obs);
      });
    },
    subscribe: function (obs) {
      return subscribe(obs);
    }
  };

  function subscribe(obs) {
    var observer = observableFactory(obs);
    observers.push(observer);

    return subscriptionFactory(function dispose() {
      observers = observers.filter(function (obs) {
        return obs !== observer;
      });
    });
  }
}

/**********************
 * Creation functions *
 **********************/

/**
 * Creates an empty stream
 * 
 * ------------------>
 */
function empty() {
  var isdisposed = false;

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);

    observer.complete();

    return subscriptionFactory(function () {
      if (!isdisposed) {
        isdisposed = true;
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
function of(value) {

  var isdisposed = false;

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);

    setTimeout(function () {
      observer.next(value);
      observer.complete();
    }, 0);

    return subscriptionFactory(function () {
      if (!isdisposed) {
        isdisposed = true;
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
function from(values) {

  var isdisposed = false;

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);

    setTimeout(function () {

      values.forEach(function (value) {
        if (!isdisposed) {
          observer.next(value);
        }
      });

      if (!isdisposed) {
        observer.complete();
      }
    }, 0);

    return subscriptionFactory(function () {
      if (!isdisposed) {
        isdisposed = true;
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
function range(min, max) {

  var values = [];

  for (var i = min; i <= max; i++) {
    values.push(i);
  }
  return from(values);
}

/**
 * Creates a stream from interval
 * 
 * -0-1-2-3-4-5-6----->
 */
function interval(period) {

  var intervalHandler;
  var isdisposed = false;

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);
    var i = 0;

    intervalHandler = setInterval(function () {
      observer.next(i);
      i++;
    }, period);

    return subscriptionFactory(function () {
      if (!isdisposed) {
        clearInterval(intervalHandler);
        isdisposed = true;
      }
    });
  });
};


/**
 * Creates a stream from an event
 */
function fromEvent(element, eventName) {

  var eventHandler;
  var isdisposed = false;

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);

    eventHandler = function (event) {
      observer.next(event)
    }

    element.addEventListener(eventName, eventHandler);

    return subscriptionFactory(function () {

      if (!isdisposed) {
        element.removeEventListener(eventName, eventHandler);
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
function take(source, n) {

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);
    var i = 0;

    var subscription = source.subscribe(observerFactory({

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

    return subscriptionFactory(function () {
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
function map(source, map) {

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);

    var subscription = source.subscribe(observerFactory({

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

    return subscriptionFactory(function () {
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
function filter (source, test) {

  return observableFactory(function (obs) {

    var observer = observerFactory(obs);

    var subscription = source.subscribe(observerFactory({

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

    return subscriptionFactory(function () {
      subscription.dispose();
    });
  });
};

