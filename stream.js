const createLogstash = require('logstash')
const HttpProxyAgent = require('https-proxy-agent')
const { ETwitterStreamEvent, TweetStream, TwitterApi } = require('twitter-api-v2');


const url = 'http://localhost:5000';
const tags = ['twitter'];
const level = "info";
const logger = createLogstash(url, tags, level);

const proxy = 'socks5://127.0.0.1:7890';
const httpAgent = new HttpProxyAgent(proxy);


async function main() {
  const client = new TwitterApi("AAAAAAAAAAAAAAAAAAAAAGDtZgEAAAAAPOwNLWV56usYUuqJ%2FUtQbXbMpiw%3Dd1cCiHvPUe6jEQfUMNNZ7zRtqOq6yGaPRZ6bwcuQeDhxO50uwf", { httpAgent }); // (create a client)
  
  const rules = await client.v2.streamRules();
  console.log("RULES", rules.data?.map(rule => rule.id));

  if (!rules.data?.includes('1498415694555205632')) {
    console.log("Adding new rule")
    const addedRules = await client.v2.updateStreamRules({
      add: [
        { value: '#covid19 OR #covid-19 OR #coronavirus', tag: 'Covid 19' },
      ],
    });
  }
  
  const updatedRules = await client.v2.streamRules();
  console.log("RULES", updatedRules.data?.map(rule => rule.id));

  const stream = await client.v2.searchStream({
    "tweet.fields": ['text', 'id', 'geo'],
  });
  
  // Awaits for a tweet
  stream.on(
    // Emitted when Node.js {response} emits a 'error' event (contains its payload).
    ETwitterStreamEvent.ConnectionError,
    err => console.log('Connection error!', err),
  );
  
  stream.on(
    // Emitted when Node.js {response} is closed by remote or using .close().
    ETwitterStreamEvent.ConnectionClosed,
    () => console.log('Connection has been closed.'),
  );
  
  stream.on(
    // Emitted when a Twitter payload (a tweet or not, given the endpoint).
    ETwitterStreamEvent.Data,
    ({ text, ...eventData}) => {
      console.log('Twitter has sent something:', eventData)
      logger.info(eventData.text, eventData);
    },
  );
  
  stream.on(
    // Emitted when a Twitter sent a signal to maintain connection active
    ETwitterStreamEvent.DataKeepAlive,
    () => console.log('Twitter has a keep-alive packet.'),
  );
  
  // Enable reconnect feature
  stream.autoReconnect = true;
  
  // Be sure to close the stream where you don't want to consume data anymore from it
    setTimeout(() => {
     stream.close();
    }, 10 * 60 * 1000)
  }
  
  main().catch(console.error)