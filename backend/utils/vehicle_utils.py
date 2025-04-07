def adjust_consumption_by_slope(consumption, road_grade):
    if road_grade == 0:
        return consumption
    elif road_grade > 0:
        return consumption * (1 + road_grade / 100)
    else:
        return consumption * (1 + road_grade / 200) 