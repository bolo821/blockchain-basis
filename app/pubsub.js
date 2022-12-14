const redis = require('redis');

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub{
    constructor ({ blockchain, transactionPool, wallet}) {
        this.blockchain = blockchain; 
        this.transactionPool = transactionPool; 
        this.wallet = wallet; 

        this.publisher = redis.createClient();
        this.subscriber = redis.createClient();

        //this.subscriber.subscribe(CHANNELS.TEST);
        //this.subscriber.subscribe(CHANNELS.BLOCKCHAIN);

        this.subscribeToChannels();

        this.subscriber.on(
            'message', 
            (channel, message) => this.handleMessage(channel, message)
            );
    }
    handleMessage(channel, message) {
        console.log(`Message received.Channel: ${channel}. Message: ${message}, `);
        const parsedMessage = JSON.parse(message);

        switch(channel){
            case CHANNELS.BLOCKCHAIN: 
                this.blockchain.replaceChain(parsedMessage); 
                break; 
            case CHANNELS.TRANSACTION: 
                if (!this.transactionPool.existingTransaction({
                    inputAddress: this.wallet.publicKey
                })) {
                    this.transactionPool.setTransaction(parsedMessage);
                }
              break;
            default: 
                return; 
        }
    }

    subscribeToChannels() {
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }
    publish({ channel, message }){
        this.subscriber.unsubscribe(channel, message, () => {
            this.publisher.publish(channel, message, () => {
                this.subscriber.subscribe(channel);
            });
        });
    }
    broadcastChain(){
        this.publish({
            channel: CHANNELS.BLOCKCHAIN, 
            message: JSON.stringify(this.blockchain.chain)
        });
    }

    broadcastTransaction(transaction) {
        this.publish({
            channel: CHANNELS.TRANSACTION, 
            message: JSON.stringify(transaction)
        }); 
    }
}

//const testPubSub = new PubSub();
//setTimeout(() => testPubSub.publisher.publish(CHANNELS.TEST, 'foo'), 1000);

module.exports = PubSub;