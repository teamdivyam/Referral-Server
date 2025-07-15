import mongoose from "mongoose";
import UserModel from "../models/user.js";

mongoose
    .connect("mongodb://localhost:27017/development-referral-program")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

const users = [
  { id: 1, fullName: "Aarav Sharma", gender: "male", mobileNum: "9876543210", email: "aarav.sharma1@email.com", dob: new Date("03/15/1995"), address: "123 Green Street, Mumbai", areaPin: "400001" },
  { id: 2, fullName: "Priya Verma", gender: "female", mobileNum: "9123456789", email: "priya.verma2@email.com", dob: new Date("07/22/1992"), address: "45 Lake Road, Delhi", areaPin: "110011" },
  { id: 3, fullName: "Rohan Mehta", gender: "male", mobileNum: "9988776655", email: "rohan.mehta3@email.com", dob: new Date("12/10/1989"), address: "56 Hill View, Pune", areaPin: "411001" },
  { id: 4, fullName: "Sneha Patel", gender: "female", mobileNum: "9871234560", email: "sneha.patel4@email.com", dob: new Date("05/05/1996"), address: "89 Sun Avenue, Ahmedabad", areaPin: "380015" },
  { id: 5, fullName: "Vikram Singh", gender: "male", mobileNum: "9123987654", email: "vikram.singh5@email.com", dob: new Date("08/18/1990"), address: "12 River Lane, Jaipur", areaPin: "302001" },
  { id: 6, fullName: "Anjali Gupta", gender: "female", mobileNum: "9988123456", email: "anjali.gupta6@email.com", dob: new Date("11/23/1993"), address: "34 Park Street, Lucknow", areaPin: "226001" },
  { id: 7, fullName: "Rahul Kumar", gender: "male", mobileNum: "9876123450", email: "rahul.kumar7@email.com", dob: new Date("09/14/1991"), address: "78 Rose Garden, Patna", areaPin: "800001" },
  { id: 8, fullName: "Neha Joshi", gender: "female", mobileNum: "9123765432", email: "neha.joshi8@email.com", dob: new Date("04/29/1997"), address: "90 Maple Street, Bhopal", areaPin: "462001" },
  { id: 9, fullName: "Amit Desai", gender: "male", mobileNum: "9988001122", email: "amit.desai9@email.com", dob: new Date("02/12/1988"), address: "67 Ocean Drive, Surat", areaPin: "395003" },
  { id: 10, fullName: "Pooja Nair", gender: "female", mobileNum: "9876543201", email: "pooja.nair10@email.com", dob: new Date("06/06/1994"), address: "23 Palm Road, Kochi", areaPin: "682001" },
  { id: 11, fullName: "Manish Agarwal", gender: "male", mobileNum: "9123456709", email: "manish.agarwal11@email.com", dob: new Date("01/19/1992"), address: "11 Lotus Lane, Kolkata", areaPin: "700001" },
  { id: 12, fullName: "Divya Reddy", gender: "female", mobileNum: "9988776600", email: "divya.reddy12@email.com", dob: new Date("10/25/1995"), address: "56 Silver Park, Hyderabad", areaPin: "500001" },
  { id: 13, fullName: "Siddharth Jain", gender: "male", mobileNum: "9876001234", email: "siddharth.jain13@email.com", dob: new Date("03/30/1987"), address: "89 Pearl Avenue, Indore", areaPin: "452001" },
  { id: 14, fullName: "Kavya Iyer", gender: "female", mobileNum: "9123009876", email: "kavya.iyer14@email.com", dob: new Date("12/11/1996"), address: "45 Coral Street, Chennai", areaPin: "600001" },
  { id: 15, fullName: "Arjun Kapoor", gender: "male", mobileNum: "9988112233", email: "arjun.kapoor15@email.com", dob: new Date("07/07/1993"), address: "12 Ruby Road, Chandigarh", areaPin: "160017" },
  { id: 16, fullName: "Riya Sinha", gender: "female", mobileNum: "9876112233", email: "riya.sinha16@email.com", dob: new Date("05/21/1998"), address: "67 Emerald Lane, Ranchi", areaPin: "834001" },
  { id: 17, fullName: "Nikhil Das", gender: "male", mobileNum: "9123556677", email: "nikhil.das17@email.com", dob: new Date("02/15/1991"), address: "34 Sapphire Street, Guwahati", areaPin: "781001" },
  { id: 18, fullName: "Meera Pillai", gender: "female", mobileNum: "9988223344", email: "meera.pillai18@email.com", dob: new Date("11/03/1992"), address: "78 Topaz Avenue, Thiruvananthapuram", areaPin: "695001" },
  { id: 19, fullName: "Rajat Chawla", gender: "male", mobileNum: "9876332211", email: "rajat.chawla19@email.com", dob: new Date("08/27/1989"), address: "56 Diamond Road, Ludhiana", areaPin: "141001" },
  { id: 20, fullName: "Simran Kaur", gender: "female", mobileNum: "9123445566", email: "simran.kaur20@email.com", dob: new Date("03/13/1997"), address: "23 Amrit Avenue, Amritsar", areaPin: "143001" },
  { id: 21, fullName: "Yashwant Rao", gender: "male", mobileNum: "9988334455", email: "yashwant.rao21@email.com", dob: new Date("09/09/1990"), address: "90 Lake View, Nashik", areaPin: "422001" },
  { id: 22, fullName: "Aishwarya Menon", gender: "female", mobileNum: "9876445566", email: "aishwarya.menon22@email.com", dob: new Date("01/16/1995"), address: "12 Lotus Lane, Madurai", areaPin: "625001" },
  { id: 23, fullName: "Karan Malhotra", gender: "male", mobileNum: "9123667788", email: "karan.malhotra23@email.com", dob: new Date("10/24/1992"), address: "45 Pine Street, Kanpur", areaPin: "208001" },
  { id: 24, fullName: "Shreya Roy", gender: "female", mobileNum: "9988445566", email: "shreya.roy24@email.com", dob: new Date("06/19/1993"), address: "67 Oak Avenue, Siliguri", areaPin: "734001" },
  { id: 25, fullName: "Saurabh Bhatt", gender: "male", mobileNum: "9876554433", email: "saurabh.bhatt25@email.com", dob: new Date("12/31/1988"), address: "34 Cedar Road, Dehradun", areaPin: "248001" },
  { id: 26, fullName: "Isha Choudhary", gender: "female", mobileNum: "9123778899", email: "isha.choudhary26@email.com", dob: new Date("04/08/1996"), address: "89 Willow Street, Jodhpur", areaPin: "342001" },
  { id: 27, fullName: "Devendra Joshi", gender: "male", mobileNum: "9988556677", email: "devendra.joshi27@email.com", dob: new Date("02/22/1994"), address: "56 Palm Avenue, Udaipur", areaPin: "313001" },
  { id: 28, fullName: "Tanvi Deshmukh", gender: "female", mobileNum: "9876667788", email: "tanvi.deshmukh28@email.com", dob: new Date("07/17/1997"), address: "12 Maple Lane, Nagpur", areaPin: "440001" },
  { id: 29, fullName: "Harsh Vardhan", gender: "male", mobileNum: "9123889900", email: "harsh.vardhan29@email.com", dob: new Date("05/04/1992"), address: "23 Elm Road, Varanasi", areaPin: "221001" },
  { id: 30, fullName: "Mitali Sen", gender: "female", mobileNum: "9988667788", email: "mitali.sen30@email.com", dob: new Date("09/20/1995"), address: "67 Birch Avenue, Durgapur", areaPin: "713216" },
  { id: 31, fullName: "Gaurav Mishra", gender: "male", mobileNum: "9876778899", email: "gaurav.mishra31@email.com", dob: new Date("11/11/1991"), address: "34 Ash Street, Allahabad", areaPin: "211001" },
  { id: 32, fullName: "Pallavi Dubey", gender: "female", mobileNum: "9123990011", email: "pallavi.dubey32@email.com", dob: new Date("01/29/1994"), address: "89 Spruce Lane, Gorakhpur", areaPin: "273001" },
  { id: 33, fullName: "Tarun Bansal", gender: "male", mobileNum: "9988778899", email: "tarun.bansal33@email.com", dob: new Date("06/06/1990"), address: "56 Poplar Avenue, Faridabad", areaPin: "121001" },
  { id: 34, fullName: "Shalini Kapoor", gender: "female", mobileNum: "9876889900", email: "shalini.kapoor34@email.com", dob: new Date("03/13/1996"), address: "12 Redwood Road, Meerut", areaPin: "250001" },
  { id: 35, fullName: "Ritesh Saxena", gender: "male", mobileNum: "9123445678", email: "ritesh.saxena35@email.com", dob: new Date("08/25/1989"), address: "23 Hazel Street, Agra", areaPin: "282001" },
  { id: 36, fullName: "Sanya Grover", gender: "female", mobileNum: "9988990011", email: "sanya.grover36@email.com", dob: new Date("12/09/1993"), address: "67 Cherry Lane, Panipat", areaPin: "132103" },
  { id: 37, fullName: "Abhinav Singh", gender: "male", mobileNum: "9876990011", email: "abhinav.singh37@email.com", dob: new Date("02/18/1992"), address: "34 Spruce Avenue, Gwalior", areaPin: "474001" },
  { id: 38, fullName: "Nikita Jain", gender: "female", mobileNum: "9123001122", email: "nikita.jain38@email.com", dob: new Date("05/27/1995"), address: "89 Magnolia Street, Jabalpur", areaPin: "482001" },
  { id: 39, fullName: "Sandeep Yadav", gender: "male", mobileNum: "9988002233", email: "sandeep.yadav39@email.com", dob: new Date("10/02/1991"), address: "56 Willow Road, Bareilly", areaPin: "243001" },
  { id: 40, fullName: "Aparna Rao", gender: "female", mobileNum: "9876002233", email: "aparna.rao40@email.com", dob: new Date("07/15/1996"), address: "12 Olive Avenue, Mysore", areaPin: "570001" },
  { id: 41, fullName: "Raghav Kapoor", gender: "male", mobileNum: "9123112233", email: "raghav.kapoor41@email.com", dob: new Date("03/07/1993"), address: "23 Maple Street, Noida", areaPin: "201301" },
  { id: 42, fullName: "Ishita Bhattacharya", gender: "female", mobileNum: "9988113344", email: "ishita.bhattacharya42@email.com", dob: new Date("11/11/1997"), address: "67 Pine Avenue, Asansol", areaPin: "713301" },
  { id: 43, fullName: "Parth Shah", gender: "male", mobileNum: "9876113344", email: "parth.shah43@email.com", dob: new Date("09/19/1990"), address: "34 Cedar Lane, Rajkot", areaPin: "360001" },
  { id: 44, fullName: "Rashmi Desai", gender: "female", mobileNum: "9123667789", email: "rashmi.desai44@email.com", dob: new Date("04/04/1994"), address: "89 Oak Road, Bhavnagar", areaPin: "364001" },
  { id: 45, fullName: "Vivek Tiwari", gender: "male", mobileNum: "9988557788", email: "vivek.tiwari45@email.com", dob: new Date("06/21/1988"), address: "56 Pine Avenue, Moradabad", areaPin: "244001" },
  { id: 46, fullName: "Surbhi Sood", gender: "female", mobileNum: "9876557788", email: "surbhi.sood46@email.com", dob: new Date("02/13/1997"), address: "12 Beech Street, Jalandhar", areaPin: "144001" },
  { id: 47, fullName: "Naveen Kumar", gender: "male", mobileNum: "9123888899", email: "naveen.kumar47@email.com", dob: new Date("08/29/1991"), address: "23 Sycamore Lane, Ghaziabad", areaPin: "201001" },
  { id: 48, fullName: "Aditi Mishra", gender: "female", mobileNum: "9988778890", email: "aditi.mishra48@email.com", dob: new Date("10/17/1995"), address: "67 Willow Avenue, Aligarh", areaPin: "202001" },
  { id: 49, fullName: "Sahil Bhatia", gender: "male", mobileNum: "9876001123", email: "sahil.bhatia49@email.com", dob: new Date("01/05/1992"), address: "34 Maple Road, Rohtak", areaPin: "124001" },
  { id: 50, fullName: "Jasleen Kaur", gender: "female", mobileNum: "9123001123", email: "jasleen.kaur50@email.com", dob: new Date("06/26/1998"), address: "89 Pine Street, Bathinda", areaPin: "151001" }
];


async function SeedUserIntoDatabase() {
    try {
        await UserModel.insertMany(users);

        console.log("Seed Completed");
    } catch (error) {
        console.error("Error in seeding user:", error.message);
    }
}

SeedUserIntoDatabase();
