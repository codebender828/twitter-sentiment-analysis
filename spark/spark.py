from pyspark import SparkConf, SparkContext
from pyspark.streaming import StreamingContext
import nltk
from geopy.geocoders import Nominatim
from textblob import TextBlob
from elasticsearch import Elasticsearch


TCP_IP = 'localhost'
TCP_PORT = 9009

print(f"\n========== SPARK STARTED ===========\n")


def processTweet(tweet):

    # Here, we implement:
    # (i) Sentiment analysis,
    # (ii) Get data corresponding to place where the tweet was generate (using geopy or googlemaps)
    # (iii) Index the data using Elastic Search
    es = Elasticsearch([{'host': 'localhost', 'port': 9200}])

    tweetData = tweet.split("::")

    if len(tweetData) > 1:

        text = tweetData[1]
        rawLocation = tweetData[0]

        # (i) Apply Sentiment analysis in "text"
        a = TextBlob(text)
        if a.sentiment.polarity < 0:
            sentiment = "negative"
        elif a.sentiment.polarity == 0:
            sentiment = "neutral"
        else:
            sentiment = "positive"

        # (ii) Get geolocation (state, country, lat, lon, etc...) from rawLocation
        print("\n\n=========================\ntweet: ", tweet)
        print("Raw location from tweet status: ", rawLocation)
        geolocator = Nominatim(user_agent="Tweetanalysis")
        location = geolocator.geocode(rawLocation, addressdetails=True)
        if location:
            lat = location.latitude
            lon = location.longitude
            if 'state' in location.raw['address'].keys():
                state = location.raw['address']['state']
            else:
                state = None
            if 'country' in location.raw['address'].keys():
                country = location.raw['address']['country']
            else:
                country = None
        else:
            lat = None
            lon = None
            state = None
            country = None
        print("lat: ", lat)
        print("lon: ", lon)
        print("state: ", state)
        print("country: ", country)
        print("Text: ", text)
        print("Sentiment: ", sentiment)

        # (iii) Post the index on ElasticSearch or log your data in some other way (you are always free!!)
        es.index(index="sentiment",
                 doc_type="test-type",
                 body={"latitude": lat,
                       "longitude": lon,
                       "state": state,
                       "country": country,
                       "Text": text,
                       "Sentiment": sentiment})


# Pyspark
# create spark configuration
conf = SparkConf()
conf.setAppName('TwitterApp')
conf.setMaster('local[2]')
# conf.set("es.index.auto.create", "true")

# create spark context with the above configuration
sc = SparkContext(conf=conf)

# create the Streaming Context from spark context with interval size 4 seconds
ssc = StreamingContext(sc, 4)
ssc.checkpoint("checkpoint_TwitterApp")

# read data from port 900
dataStream = ssc.socketTextStream(TCP_IP, TCP_PORT)


dataStream.foreachRDD(lambda rdd: rdd.foreach(processTweet))


ssc.start()
ssc.awaitTermination()
