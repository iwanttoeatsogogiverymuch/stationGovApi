import os
import pandas as pd
import openpyxl
for sheet_name, df in pd.read_excel(r"sidocode.xlsx",sheet_name=None,engine='openpyxl').items():
    df.to_csv("{}.csv".format(sheet_name),encoding='utf-8')
    print("save : "+ "{}.csv".format(sheet_name))
