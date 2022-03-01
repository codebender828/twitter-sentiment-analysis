const createLogstash = require('logstash')
const HttpProxyAgent = require('https-proxy-agent')
const { ETwitterStreamEvent, TwitterApi } = require('twitter-api-v2');
const sentiment = require('node-sentiment');

// Performs sentiment analysis
function processSentiment(text = '', lang = 'en') {
  const analysis = sentiment(text, lang)
  return analysis
}

// Cleans the input string and removes emojis e.g. ":) or 😀"
const sanitize = text => text.replace(
  /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, ''
);


const url = 'http://localhost:5000';
const tags = ['twitter'];
const level = "info";
const logger = createLogstash(url, tags, level);

const proxy = 'socks5://127.0.0.1:7890';
const httpAgent = new HttpProxyAgent(proxy);


async function main() {
  // 1. Create a Twitter API client
  const client = new TwitterApi(
    "AAAAAAAAAAAAAAAAAAAAAGDtZgEAAAAAPOwNLWV56usYUuqJ%2FUtQbXbMpiw%3Dd1cCiHvPUe6jEQfUMNNZ7zRtqOq6yGaPRZ6bwcuQeDhxO50uwf",
    { httpAgent }
  )
  
  // 2. Define rules for the required input
  const rules = await client.v2.streamRules();
  if (!rules.data?.includes('1498415694555205632')) {
    await client.v2.updateStreamRules({
      add: [
        { value: '#covid19 OR #covid-19 OR #coronavirus', tag: 'Covid 19' },
      ],
    });
  }
  
  // Output stream rules to make sure they are compliant with output
  const updatedRules = await client.v2.streamRules();
  console.log("RULES", updatedRules.data?.map(rule => rule.id));

  // 3. Create stram instance
  const stream = await client.v2.searchStream({
    "tweet.fields": ['text', 'id', 'geo', 'lang'],
  });
  
  // Error handling
  stream.on(
    ETwitterStreamEvent.ConnectionError,
    err => console.log('Connection error!', err),
  );
  
  // Close stream
  stream.on(
    ETwitterStreamEvent.ConnectionClosed,
    () => console.log('Connection has been closed.'),
  );
  
  // New stream chunk handler
  stream.on(
    ETwitterStreamEvent.Data,
    async ({ data }) => {

      // Sanitizes text to remove emojis
      const sanitizedText = sanitize(data.text)

      // 4. Perform sentiment analysis
      const analysis = processSentiment(sanitizedText, data.lang)
      
      console.log({
        ...data,
        "@sentiment": analysis
      })

      try {

        // 5. Stream sentiment data to Logstash
        logger.info(sanitizedText, {
          message: sanitizedText,
          vote: analysis.vote,
          score: analysis.score,
          language: data.lang,
          positive: analysis.positive,
          negative: analysis.negative,
          tokens: analysis.tokens
        });
      } catch (error) {
        console.error("Failed to parse sentiment. Failing gracefully", error)
      }
    },
  );
  
  // Here we use this event to keep the stream open
  // when the client recieves a new object.
  stream.on(
    ETwitterStreamEvent.DataKeepAlive,
    () => console.log('Twitter has a keep-alive packet.'),
  );
  
  // Enable reconnect feature
  stream.autoReconnect = true;
  
  // Here we close the stream 
  // after 10 minutes where you don't
  // want to consume data anymore from it
  setTimeout(() => {
    stream.close();
  }, 10 * 60 * 1000)
}
  
  main().catch(console.error)