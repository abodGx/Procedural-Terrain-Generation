(() => {
    'use strict';

    // This script should be imported at the top of user's worker-script
    function initDelegatedEventReceiver(evt) {
        // currently the only option is "once"
        const defaultOptionsDict = {
            once: false,
        };
        // in case it's not our message (which would be quite odd...)
        if (evt.data !== 'init-event-delegation') {
            return;
        }

        // let's not let user-script know it happend
        evt.stopImmediatePropagation();
        removeEventListener('message', initDelegatedEventReceiver, true);

        // this is where the main thread will let us know when a new target is available
        const main_port = evt.ports[0];

        class EventDelegate {
            constructor(port, context) {
                this.port = port; // the port to communicate with main
                this.context = context; // can help identify our target
                this.callbacks = {}; // we'll store the added callbacks here
                // this will fire when main thread fired an event on our target
                port.onmessage = (evt) => {
                    const evt_object = evt.data;
                    const slot = this.callbacks[evt_object.type];
                    if (slot) {
                        const to_remove = [];
                        slot.forEach(({callback, options}, index) => {
                            try {
                                callback(evt_object);
                            } catch (e) {
                                // we don't want to block our execution,
                                // but still, we should notify the exception
                                setTimeout(() => {
                                    throw e;
                                });
                            }
                            if (options.once) {
                                to_remove.push(index);
                            }
                        });
                        // remove 'once' events
                        to_remove.reverse().forEach((index) => slot.splice(index, 1));
                    }
                };
            }

            addEventListener(type, callback, options = defaultOptionsDict) {
                const callbacks = this.callbacks;
                let slot = callbacks[type];
                if (!slot) {
                    slot = callbacks[type] = [];
                    // make the main thread attach only a single event,
                    // we'll handle the multiple callbacks
                    // and since we force { passive: true, capture: false }
                    // they'll all get attached the same way there
                    this.port.postMessage({type, action: 'add'});
                }
                // to store internally, and avoid duplicates (like EventTarget.addEventListener does)
                const new_item = {
                    callback,
                    options,
                    options_as_string: stringifyOptions(options),
                };
                if (!getStoredItem(slot, new_item)) {
                    slot.push(new_item);
                }
            }

            removeEventListener(type, callback, options = defaultOptionsDict) {
                const callbacks = this.callbacks;
                const slot = callbacks[type];
                const options_as_string = stringifyOptions(options);

                const item = getStoredItem(slot, {
                    callback,
                    options,
                    options_as_string,
                });
                const index = item && slot.indexOf(item);

                if (item) {
                    slot.splice(index, 1);
                }
                if (slot && !slot.length) {
                    delete callbacks[type];
                    // we tell the main thread to remove the event handler
                    // only when there is no callbacks of this type anymore
                    this.port.postMessage({type, action: 'remove'});
                }
            }
        }

        // EventInitOptions need to be serialized in a deterministic way
        // so we can detect duplicates
        function stringifyOptions(options) {
            if (typeof options === 'boolean') {
                options = {once: options};
            }
            try {
                return JSON.stringify(
                    Object.fromEntries(Object.entries(options).sort(byKeyAlpha))
                );
            } catch (e) {
                return JSON.stringify(defaultOptionsDict);
            }
        }

        function byKeyAlpha(entry_a, entry_b) {
            return entry_a[0].localeCompare(entry_b[0]);
        }

        // retrieves an event item in a slot based on its callback and its stringified options
        function getStoredItem(slot, {callback, options_as_string}) {
            return (
                Array.isArray(slot) &&
                slot.find((obj) => {
                    return (
                        obj.callback === callback &&
                        obj.options_as_string === options_as_string
                    );
                })
            );
        }

        // a new EventTarget has been declared by main thread
        main_port.onmessage = (evt) => {
            const target_added_evt = new Event('eventtargetadded');
            target_added_evt.dt = new EventDelegate(
                evt.ports[0],
                evt.data
            );
            dispatchEvent(target_added_evt);
        };
    }

    addEventListener('message', initDelegatedEventReceiver);
})();
