(() => {
    'use strict';

    const default_event_options_dict = {
        capture: false,
        passive: true,
    };
    const event_keys_to_remove = new Set(['view', 'target', 'currentTarget']);

    class EventDelegatingWorker extends Worker {
        constructor(url, options) {
            super(url, options);
            // this channel will be used to notify the Worker of added targets
            const channel = new MessageChannel();
            this._mainPort = channel.port2;
            this.postMessage('init-event-delegation', [channel.port1]);
        }

        addEventTarget(event_target, context) {
            // this channel will be used to notify us when the Worker adds or removes listeners
            // and to notify the worker of new events fired on the target
            const channel = new MessageChannel();
            channel.port1.onmessage = (evt) => {
                const {type, action} = evt.data;
                if (action === 'add') {
                    event_target.addEventListener(
                        type,
                        handleDOMEvent,
                        default_event_options_dict
                    );
                } else if (action === 'remove') {
                    event_target.removeEventListener(
                        type,
                        handleDOMEvent,
                        default_event_options_dict
                    );
                }
            };
            // let the Worker side know they have a new target they can listen on
            this._mainPort.postMessage(context, [channel.port2]);

            function handleDOMEvent(domEvent) {
                channel.port1.postMessage(sanitizeEvent(domEvent));
            }
        }
    }

    window.EventDelegatingWorker = EventDelegatingWorker;

    // Events can not be cloned as is, so we need to stripe out all non cloneable properties
    function sanitizeEvent(evt) {
        const copy = {};
        // Most events only have .isTrusted as own property, so we use a for in loop to get all
        // otherwise JSON.stringify() would just ignore them
        for (let key in evt) {
            if (event_keys_to_remove.has(key)) {
                continue;
            }
            copy[key] = evt[key];
        }

        const as_string = tryToStringify(copy);
        return JSON.parse(as_string);

        // over complicated recursive function to handle cross-origin access
        function tryToStringify() {
            const referenced_objects = new Set(); // for cyclic
            // for cross-origin objects (e.g window.parent in a cross-origin iframe)
            // we save the previous key value so we can delete it if throwing
            let lastKey;
            let nextVal = copy;
            let lastVal = copy;
            try {
                return JSON.stringify(copy, removeDOMRefsFunctionsAndCyclics);
            } catch (e) {
                delete lastVal[lastKey];
                return tryToStringify();
            }

            function removeDOMRefsFunctionsAndCyclics(key, value) {
                lastVal = nextVal;
                lastKey = key;

                if (typeof value === 'function') {
                    return;
                }
                if (typeof value === 'string' || typeof value === 'number') {
                    return value;
                }
                if (value && typeof value === 'object') {
                    if (value instanceof Node) {
                        return;
                    }
                    if (referenced_objects.has(value)) {
                        return '[cyclic]';
                    }
                    referenced_objects.add(value);
                    nextVal = value;
                    return value;
                }
                return value;
            }
        }
    }
})();