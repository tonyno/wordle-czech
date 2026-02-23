import hashlib
import json

import firebase_admin
from firebase_admin import credentials, firestore

if __name__ == '__main__':

    # Use a service account
    cred = credentials.Certificate(
        'data_calculate/wordle-cz-firebase-adminsdk-q7ldn-01d406365d.json')
    firebase_admin.initialize_app(cred)

    db = firestore.client()

    games_since_Feb_14 = 0
    items = 0
    games = 0
    win = 0
    loose = 0
    guesses = {}

    # https://firebase.google.com/docs/firestore/query-data/queries#python_6
    doc_ref = db.collection(u'gameStats').document(
        u'wordle').get()
    if doc_ref.exists:
        for key, value in doc_ref.to_dict().items():
            items += 1
            # print(value)

            games += value['games']
            win += value['win']
            loose += value['loose']
            for guess in value['firstGuesses']:
                word = guess['word']
                if word not in guesses:
                    guesses[word] = 0
                guesses[word] += guess['count']
            # if items > 10:
            #    break

    total_duration = 0  # seconds
    total_count = 0
    for day in range(600, 650):  # 450
        print("Day ", day)
        # https://firebase.google.com/docs/firestore/query-data/queries#python_6
        doc_ref = db.collection(u'gameResult').document(
            u'day{}'.format(day)).collection(u'result').stream()
        for item in doc_ref:
            data = item.to_dict()
            if 'duration' in data and 'result' in data and (data['duration'] / 1000) < 20*60:
                total_duration += data['duration'] / 1000
                total_count += 1
            if total_count > 10:
                break

    print("Games: {}, win: {}, loose: {}".format(games, win, loose))
    first_guesses = dict(
        sorted(guesses.items(), key=lambda item: item[1], reverse=True))
    print(first_guesses)

    print("Total count {}, avg: {}".format(
        total_count, round(total_duration / total_count)))

#     Games: 4459968, win: 4054716, loose: 405252
# {'LOUKA': 72307, 'KOULE': 58103, 'LÁSKA': 42309, 'PRASE': 30952, 'KOČKA': 7703, 'KOTEL': 5739, 'PRDEL': 3772, 'VÁLKA': 1428, 'PENIS': 1182, 'VOLBY': 1153, 'VOLBA': 556, 'DÁREK': 495, 'HOKEJ': 446, 'AUDIO': 433, 'STROM': 283, 'KRYSA': 198, 'POŽÁR': 173, 'ŠKOLA': 156, 'TONDA': 128, 'KONEC': 122, 'MĚSTO': 113, 'MOUKA': 102, 'PERLA': 2, 'KNIHA': 2}
# Total count 378982, avg: 9489


# 15.12.2023
# Games: 5615141, win: 5109685, loose: 505456
# {'LOUKA': 96973, 'KOULE': 74814, 'LÁSKA': 59110, 'PRASE': 30952, 'KOČKA': 7703, 'KOTEL': 5795, 'PRDEL': 3772, 'AUDIO': 1592, 'VÁLKA': 1428, 'PENIS': 1182, 'VOLBY': 1153, 'VOLBA': 556, 'DÁREK': 495, 'HOKEJ': 446, 'STROM': 283, 'KRYSA': 198, 'POŽÁR': 173, 'MOUKA': 172, 'ŠKOLA': 156, 'TONDA': 128, 'KONEC': 122, 'MĚSTO': 113, 'POKUS': 84, 'PERLA': 2, 'KNIHA': 2}
# Total count 284106, avg: 207

# 12.10.2024
# Games: 7186887, win: 6548724, loose: 638163
# {'LOUKA': 131337, 'KOULE': 97527, 'LÁSKA': 83790, 'PRASE': 30952, 'KOČKA': 7703, 'KOTEL': 5818, 'PRDEL': 3772, 'AUDIO': 1858, 'VÁLKA': 1428, 'HOKEJ': 1352, 'PENIS': 1182, 'VOLBY': 1153,
#     'DÁREK': 813, 'VOLBA': 556, 'STROM': 391, 'KONEC': 204, 'KRYSA': 198, 'POŽÁR': 173, 'MOUKA': 172, 'ŠKOLA': 156, 'TONDA': 128, 'MĚSTO': 113, 'POKUS': 84, 'TANEC': 74, 'PERLA': 2, 'KNIHA': 2}
# Total count 53, avg: 252
# 1.6 mio sessions on unora
# 9.2 mio celkem
# 

# 29.4.2024
# Games: 8143236, win: 7425483, loose: 717753
# {'LOUKA': 151426, 'KOULE': 112253, 'LÁSKA': 98584, 'PRASE': 31017, 'KOČKA': 7703, 'KOTEL': 5818, 'PRDEL': 3772, 'AUDIO': 2101, 'VÁLKA': 1428, 'HOKEJ': 1352, 'PENIS': 1182, 'VOLBY': 1153,
#    'DÁREK': 946, 'VOLBA': 556, 'STROM': 544, 'MOUKA': 219, 'KONEC': 204, 'KRYSA': 198, 'POŽÁR': 173, 'ŠKOLA': 156, 'TONDA': 128, 'MĚSTO': 113, 'POKUS': 84, 'TANEC': 74, 'PERLA': 2, 'KNIHA': 2}
# Total count 53, avg: 243
