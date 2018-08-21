const ServiceManagerTypes = require('../helpers/serviceManagerTypes');
const delayForDuration = require('../helpers/delayForDuration');
const catchDelayCancelError = require('../helpers/catchDelayCancelError');
const ping = require('../helpers/ping')
const BroadlinkRMAccessory = require('./accessory');

class SpeakerAccessory extends BroadlinkRMAccessory {
  async setSwitchState (hexData) {
    if (hexData) await this.performSend([{
      pause: 1,
      data: hexData
    }]);
  }

  async setMute (hexData) {
    if (hexData) await this.performSend(hexData);
  }

  async setVolume () {
    const { log, name, state, data, config } = this;
    const { volumeSteps } = config;

    if (!this.currentStep) {
      log(`${name} Resetting volume`)
      this.currentStep = 0;

      await this.performSend([{
        sendCount: volumeSteps,
        interval: 0.2,
        data: data.volumeDown
      }]);
    }

    const requestedStep = Math.floor(state.volume / 100 * volumeSteps);
    const difference = requestedStep - this.currentStep;
    log(`${name} (volume: ${state.volume}, volumeSteps: ${volumeSteps}, requestedStep: ${requestedStep}, currentStep: ${this.currentStep})`);

    if (requestedStep === this.currentStep) {
      return log(`${name} already at step level, skipping`);
    }

    log(`${name} Sending volume commands (diff: ${difference})`)
    if (difference < 0) {
      await this.performSend([{
        sendCount: Math.abs(difference),
        interval: 0.2,
        data: data.volumeDown
      }]);
    } else {
      await this.performSend([{
        sendCount: Math.abs(difference),
        interval: 0.2,
        pause: 1,
        data: data.volumeUp
      }]);
    }

    this.currentStep = requestedStep;
  }

  setupServiceManager () {
    const { data, name, config, serviceManagerType } = this;
    const { powerToggle } = data || { };

    this.serviceManager = new ServiceManagerTypes[serviceManagerType](name, Service.Lightbulb, this.log);

    this.serviceManager.addToggleCharacteristic({
      name: 'switchState',
      type: Characteristic.On,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        onData: powerToggle || data,
        offData: powerToggle || undefined,
        setValuePromise: this.setSwitchState.bind(this)
      }
    });

    this.serviceManager.addToggleCharacteristic({
      name: 'volume',
      type: Characteristic.Brightness,
      getMethod: this.getCharacteristicValue,
      setMethod: this.setCharacteristicValue,
      bind: this,
      props: {
        setValuePromise: this.setVolume.bind(this)
      }
    });
  }
}

module.exports = SpeakerAccessory;
