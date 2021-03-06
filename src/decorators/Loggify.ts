import logger from '../logger';
import util from 'util';

let LoggifiedClasses: { [key: string]: boolean } = {};
export function LoggifyClass<T extends { new (...args: any[]): {} }>(
  aClass: T
) {
  return class extends aClass {
    constructor(...args: any[]) {
      super(...args);
      var self = this;
      if (!LoggifiedClasses[aClass.name]) {
        LoggifiedClasses[aClass.name] = true;
        logger.debug(
          `Loggifying ${aClass.name} with args:: ${JSON.stringify(args)}`
        );
        LoggifyObject(aClass, aClass.name, self);
      }
    }
  };
}

export function LoggifyMethod(className: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<Function>
  ) {
    let prop = propertyKey;
    if (descriptor.value != undefined) {
      descriptor.value = LoggifyFunction(descriptor.value, className);
    }
  };
}

export function LoggifyFunction(fn: Function, logPrefix?: string, bind?: any) {
  let copy = fn;
  if (bind) {
    copy = copy.bind(bind);
  }
  return function(...methodargs: any[]) {
    logger.debug(`${logPrefix}::args::${util.inspect(methodargs)}`);
    let returnVal = copy(...methodargs);
    if (returnVal && <Promise<any>>returnVal.then) {
      returnVal
        .catch((err: any) => {
          logger.error(`${logPrefix}::catch::${err}`);
          throw err;
        })
        .then((data: any) => {
          logger.debug(`${logPrefix}::resolved::${util.inspect(data)}`);
          return data;
        });
    } else {
      logger.debug(`${logPrefix}::returned::${util.inspect(returnVal)}`);
    }
    return returnVal;
  };
}

export function LoggifyObject(obj: any, logPrefix: string = '', bind?: any) {
  for (let prop of Object.getOwnPropertyNames(obj)) {
    if (typeof obj[prop] === 'function') {
      let copy = obj[prop];
      if (bind) {
        copy = copy.bind(bind);
      }
      logger.debug(`Loggifying  ${logPrefix}::${prop}`);
      obj[prop] = LoggifyFunction(obj[prop], `${logPrefix}::${prop}`, bind);
    }
  }
  return obj;
}
