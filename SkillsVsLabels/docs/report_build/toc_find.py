import subprocess,json,re,sys
pdf,out=sys.argv[1],sys.argv[2]
items=["Executive Summary","1. Problem Definition and Analytics Objective","2. Approach Description","3. Data Exploration: Management, Derivation and Preparation","3.1 Data audit","3.2 Data issues and treatment","3.3 Derived variables","3.4 Exploratory findings","4. Data Analysis","4.1 Q1 Which skills carry a pay premium?","4.2 Q2 Do job titles still pay once skills are controlled?","4.3 Q3 When does salary growth flatten?","4.4 Q4 Which skills earn a junior a high salary hike?","4.5 Q5 Which traits mark a successful senior?","4.6 The decision-support dashboard","5. Results and Conclusions","6. Implications","Appendix"]
n=int(re.search(r'Pages:\s+(\d+)',subprocess.run(['pdfinfo',pdf],capture_output=True,text=True).stdout).group(1))
pages=[subprocess.run(['pdftotext','-f',str(i),'-l',str(i),'-layout',pdf,'-'],capture_output=True,text=True).stdout for i in range(1,n+1)]
res={}
for it in items:
    for i,p in enumerate(pages):
        if i<2: continue
        if any(l.strip()==it for l in p.splitlines()): res[it]=i+1;break
print(n,len(res),res); json.dump(res,open(out,'w'))
