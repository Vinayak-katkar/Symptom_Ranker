import java.util.*;
import java.util.stream.*;

/**
 * Symptom Ranker — Java console program
 *
 * Replicates the core logic from the demo website:
 * - Synonym normalization
 * - Disease definitions with onset timelines
 * - Ranking by match ratio and timeline alignment (80/20 weighting)
 * - Prints missing symptoms and simple precautions
 *
 * Usage (interactive):
 *  1) Run the program
 *  2) Enter comma-separated symptoms (e.g., fever, cough, sore throat)
 *  3) For each entered symptom, specify days ago (integer)
 *  4) Select how many top results to display (3/5/10)
 */
public class SymptomRanker {

    private static final Map<String, String> SYNS = Map.ofEntries(
        Map.entry("high temperature", "fever"),
        Map.entry("throat pain", "sore throat"),
        Map.entry("blocked nose", "nasal congestion"),
        Map.entry("stuffy nose", "nasal congestion"),
        Map.entry("running nose", "runny nose"),
        Map.entry("body pain", "muscle pain"),
        Map.entry("tummy pain", "abdominal pain"),
        Map.entry("stomach pain", "abdominal pain"),
        Map.entry("breathlessness", "shortness of breath")
    );

    private static String norm(String s){
        if(s == null) return "";
        String t = s.toLowerCase().trim().replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ");
        return SYNS.getOrDefault(t, t);
    }

    private static final List<String> SYMPTOM_LIST = List.of(
        "fever","fever with chills","cough","sore throat","headache","runny nose","nasal congestion",
        "muscle pain","tiredness","abdominal pain","vomiting","diarrhea","sneezing","itchy eyes","watery eyes",
        "nausea","rash","joint pain","sweating","light sensitivity","sound sensitivity","mild fever","chills"
    );

    static class Disease {
        final String name;
        final List<String> symptoms;
        final Map<String,Integer> onset;
        Disease(String name, List<String> symptoms, Map<String,Integer> onset){
            this.name = name;
            this.symptoms = symptoms.stream().map(SymptomRanker::norm).toList();
            this.onset = onset;
        }
    }

    private static final List<Disease> DISEASES = List.of(
        new Disease("Common Cold", List.of("runny nose","sore throat","sneezing","cough","mild fever","tiredness"),
            Map.of("runny nose",1,"sore throat",0,"sneezing",1,"cough",2,"mild fever",1,"tiredness",2)),
        new Disease("Influenza (Flu)", List.of("fever","chills","headache","muscle pain","tiredness","cough","sore throat"),
            Map.of("fever",1,"chills",1,"headache",1,"muscle pain",1,"tiredness",2,"cough",2,"sore throat",1)),
        new Disease("Allergic Rhinitis", List.of("sneezing","runny nose","itchy eyes","watery eyes","nasal congestion"),
            Map.of("sneezing",0,"runny nose",0,"itchy eyes",0,"watery eyes",0,"nasal congestion",0)),
        new Disease("Migraine", List.of("headache","nausea","vomiting","light sensitivity","sound sensitivity"),
            Map.of("headache",0,"nausea",0,"vomiting",0)),
        new Disease("Gastroenteritis", List.of("diarrhea","vomiting","abdominal pain","fever","tiredness"),
            Map.of("diarrhea",0,"vomiting",0,"abdominal pain",0,"fever",1)),
        new Disease("Dengue (demo)", List.of("fever","headache","muscle pain","joint pain","rash","nausea"),
            Map.of("fever",3,"headache",3,"muscle pain",3)),
        new Disease("Malaria (demo)", List.of("fever","chills","sweating","headache","nausea","vomiting"),
            Map.of("fever",7,"chills",7,"sweating",7))
    );

    private static final Map<String,List<String>> PRECAUTIONS = Map.ofEntries(
        Map.entry("fever", List.of("Drink plenty of water","Take rest","Use paracetamol if needed")),
        Map.entry("cough", List.of("Drink warm water","Avoid cold drinks","Steam inhalation")),
        Map.entry("sore throat", List.of("Gargle warm salt water","Avoid spicy foods","Drink warm tea")),
        Map.entry("runny nose", List.of("Use soft tissues","Avoid dust and cold air")),
        Map.entry("nasal congestion", List.of("Steam inhalation","Use saline drops")),
        Map.entry("headache", List.of("Rest in a quiet room","Drink water")),
        Map.entry("muscle pain", List.of("Light stretching","Rest","Hydrate")),
        Map.entry("diarrhea", List.of("Drink ORS","Avoid oily food")),
        Map.entry("vomiting", List.of("Sip water slowly","Eat bland food")),
        Map.entry("abdominal pain", List.of("Avoid junk food","Rest")),
        Map.entry("shortness of breath", List.of("Sit upright","Seek medical help if severe")),
        Map.entry("tiredness", List.of("Sleep well","Eat nutritious food"))
    );

    static class Result {
        final String disease;
        final int matchCount;
        final int totalSymptoms;
        final double confidence;
        final double timelineScore;
        final List<String> missing;
        final double finalScore;
        Result(String disease,int matchCount,int totalSymptoms,double confidence,double timelineScore,List<String> missing,double finalScore){
            this.disease=disease;this.matchCount=matchCount;this.totalSymptoms=totalSymptoms;this.confidence=confidence;this.timelineScore=timelineScore;this.missing=missing;this.finalScore=finalScore;
        }
    }

    static List<Result> analyze(List<String> selected, Map<String,Integer> timeline, int top){
        List<String> normSel = selected.stream().map(SymptomRanker::norm).distinct().toList();
        List<Result> entries = new ArrayList<>();
        for(Disease d: DISEASES){
            Set<String> diseaseSet = new HashSet<>(d.symptoms);
            List<String> matches = normSel.stream().filter(diseaseSet::contains).toList();
            int matchCount = matches.size();
            if(matchCount==0){
                continue;
            }
            List<String> missing = d.symptoms.stream().filter(s -> !normSel.contains(s)).toList();
            double confidence = (matchCount * 100.0) / d.symptoms.size();
            int timelineMatches = 0, timelinePossible = 0;
            for(String s: matches){
                Integer expected = d.onset.get(s);
                if(expected != null){
                    timelinePossible++;
                    int actual = timeline.getOrDefault(s, expected);
                    if(Math.abs(actual - expected) <= 1) timelineMatches++;
                }
            }
            double timelineScore = timelinePossible>0 ? (timelineMatches*100.0)/timelinePossible : 0.0;
            double finalScore = (confidence*0.8) + (timelineScore*0.2);
            entries.add(new Result(d.name, matchCount, d.symptoms.size(), round1(confidence), round1(timelineScore), missing, round1(finalScore)));
        }
        return entries.stream()
            .sorted(Comparator.comparingDouble((Result r) -> r.finalScore).reversed())
            .limit(top)
            .collect(Collectors.toList());
    }

    private static double round1(double v){ return Math.round(v*10.0)/10.0; }

    private static void printResults(List<Result> results){
        if(results.isEmpty()){
            System.out.println("No likely diseases found for the entered symptoms.");
            return;
        }
        for(Result r: results){
            System.out.printf("%n== %s ==%n", r.disease);
            System.out.printf("Matches: %d/%d | Timeline: %.1f%% | Confidence: %.1f%%%n", r.matchCount, r.totalSymptoms, r.timelineScore, r.finalScore);
            System.out.print("Missing symptoms: ");
            if(r.missing.isEmpty()) System.out.println("None"); else System.out.println(String.join(", ", r.missing));
        }
    }

    private static void printPrecautions(List<String> selected){
        System.out.println("\nPrecautions (by selected symptom):");
        for(String s: selected){
            String ns = norm(s);
            List<String> tips = PRECAUTIONS.get(ns);
            if(tips == null){
                System.out.printf("- %s: (none specific)\n", ns);
            } else {
                System.out.printf("- %s: %s\n", ns, String.join(" • ", tips));
            }
        }
    }

    public static void main(String[] args){
        Scanner sc = new Scanner(System.in);
        System.out.println("Symptom Ranker (Java) — Educational demo");
        System.out.println("Enter symptoms separated by commas (e.g., fever, cough, sore throat):");
        String line = sc.nextLine();
        List<String> raw = Arrays.stream(line.split(","))
                                 .map(String::trim)
                                 .filter(s -> !s.isEmpty())
                                 .collect(Collectors.toList());
        if(raw.isEmpty()){
            System.out.println("No symptoms entered. Exiting.");
            return;
        }
        List<String> selected = raw.stream().map(SymptomRanker::norm).distinct().collect(Collectors.toList());
        Map<String,Integer> timeline = new HashMap<>();
        System.out.println("Enter days ago for each symptom (integer, default 0):");
        for(String s: selected){
            System.out.print("- " + s + ": ");
            String v = sc.nextLine().trim();
            int d = 0;
            try { if(!v.isEmpty()) d = Integer.parseInt(v); } catch(NumberFormatException ignored){}
            timeline.put(s, d);
        }
        System.out.print("How many top results to show (3/5/10)? [5]: ");
        String t = sc.nextLine().trim();
        int top = 5;
        try { if(!t.isEmpty()) top = Integer.parseInt(t); } catch(NumberFormatException ignored){}

        List<Result> results = analyze(selected, timeline, top);
        printResults(results);
        printPrecautions(selected);

        System.out.println("\nNote: This is educational only. Always consult a doctor for medical advice.");
    }
}
