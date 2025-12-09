// movies.js
const movieList = [
    {
    "id": 1478821,
    "title": "Mang Mẹ Đi Bỏ",
    "original_title": "Mang Mẹ Đi Bỏ",
    "overview": "Rời Xa Mẹ kể về câu chuyện của Hoan (Tuấn Trần), một chàng trai trẻ kiếm sống bằng nghề cắt tóc 'gã hề đường phố' để chăm sóc mẹ. Mẹ anh, Lê Thị Hạnh (Hồng Đào), mắc bệnh Alzheimer và cư xử như một đứa trẻ. Căn bệnh của bà không chỉ là gánh nặng tài chính mà còn tước đi cuộc sống tự do và những ước mơ mà anh vẫn đang theo đuổi. Một ngày nọ, Hoan đưa ra một quyết định định mệnh - 'gửi mẹ' cho anh trai mình ở Hàn Quốc, một người mà anh thậm chí chưa từng gặp mặt.",
    "poster_path": "https://image.tmdb.org/t/p/w500/ene2eO4C7We80YIcu7yX9zVGsSS.jpg",
    "release_date": "2025-07-30",
    "vote_average": 8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/z4y1rojm0zztpvswfw8wd/Leaving-Mom.2025.1080p.WEB-DL.H264.AAC.mp4?rlkey=6gi8u981a64eq8eypyg5fvs2b&st=j7due4jf&dl=1&dl=1"
    },
    {
        "id": 1010756,
        "title": "Sát Nhân Giấu Mặt: Chương 2",
        "original_title": "The Strangers: Chapter 2",
        "overview": "Sau những sự kiện kinh hoàng ở phần trước, Maya bị mắc kẹt tại một thị trấn nhỏ không lối thoát. Khi màn đêm buông xuống, ba kẻ sát nhân đeo mặt nạ lại xuất hiện, biến nơi đây thành địa ngục trần gian. Maya không chỉ phải chạy trốn mà còn phải đối mặt với quá khứ và nỗi sợ hãi sâu thẳm nhất của mình.",
        "poster_path": "https://image.tmdb.org/t/p/w500/aEk9jLbiKTVssdATbrF879NvyyJ.jpg",
        "release_date": "2025-09-25",
        "vote_average": 6.11,
        // Đã sửa link dưới (xóa &dl=0 thừa)
        "dropbox_link": "https://www.dropbox.com/scl/fi/mjw76u8iknlaviooh7t61/The.Strangers.Chapter.2.2025.Hybrid.1080p.BluRay.x264-BRUTE.mkv?rlkey=o7lbomu84wex3zmmtkpoulisi&st=jqhmtvsd&dl=1"
    },
    {
    "id": 1390401,
    "title": "Vyšehrad Dvje",
    "original_title": "Vyšehrad Dvje",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/hb4prLWVThOJ4BgFacO5NqgYOcy.jpg",
    "release_date": "2025-04-17",
    "vote_average": 5.6,
    "dropbox_link": "https://www.dropbox.com/scl/fi/gnlxb6w1ycm4j5dkha2xi/Vysehrad-Dvje.2025.1080p.Blu-ray.Remux.AVC.DTS-HD.MA.5.1-MBH.mkv?rlkey=499nwmgbtlbh74pmesaoj59yo&st=4edqjhe8&dl=0&dl=1"
    },

    {
    "id": 1574042,
    "title": "Predator: Wastelands",
    "original_title": "Predator: Wastelands",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/bQ0neJZ5QAD6jRHIbbdx2rtMBUb.jpg",
    "release_date": "2025-11-04",
    "vote_average": 5.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/6rh7n133ab0wys7huk1jj/Predator.Wastelands.2025.1080p.AMZN.WEB-DL.DDP5.1.H.264-WADU.mkv?rlkey=wc2tpyghchuyztgxldylzdzk5&st=heorsg25&dl=0&dl=1"
    },

    {
    "id": 1241470,
    "title": "Cuộc Chiến Ngoài Hành Tinh",
    "original_title": "Osiris",
    "overview": "Một nhóm lính đặc nhiệm bị bắt cóc bởi một tàu vũ trụ bí ẩn trong lúc làm nhiệm vụ. Khi tỉnh lại, họ phải chiến đấu để sinh tồn trước một chủng tộc ngoài hành tinh hung hãn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/3YtZHtXPNG5AleisgEatEfZOT2w.jpg",
    "release_date": "2025-07-25",
    "vote_average": 6.303,
    "dropbox_link": "https://www.dropbox.com/scl/fi/2c93rfp0pj10ewdz6xsc4/Osiris.2025.ViE.1080p.BluRay.x264-VETO.mkv?rlkey=0nra9arbtbu5z3apxi1amo32x&st=wwkd0j5q&dl=0&dl=1"
    },
    {
    "id": 1131759,
    "title": "Toàn Trí Độc Giả",
    "original_title": "전지적 독자 시점",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/6BTk9XiV6kVOzO5RSFRE2jEy0Yz.jpg",
    "release_date": "2025-07-23",
    "vote_average": 6.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/sdtysoqu94k66xwb61i7u/Omniscient.Reader.The.Prophecy.2025-1080p.BluRay.TrueHD.Atmos.7.1-x264-WATCHABLE.mkv?rlkey=z3wwcdcq49mju7ko2wrn4mrd0&st=ipm29c15&dl=0&dl=1"
    },

    {
    "id": 1386792,
    "title": "Lefter: Câu chuyện của Ordinarius",
    "original_title": "Lefter: Bir Ordinaryüs Hikayesi",
    "overview": "Một thần đồng bóng đá vươn lên thành danh, chiến đấu với định kiến và những giằng xé nội tâm để chạm tới sự vĩ đại. Phim dựa trên cuộc đời của Lefter, huyền thoại của Thổ Nhĩ Kỳ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/pvy0dINISg6SIlRpzALX0p284lm.jpg",
    "release_date": "2025-11-13",
    "vote_average": 6.538,
    "dropbox_link": "https://www.dropbox.com/scl/fi/qu9fcs806isf018zaglzg/Lefter.The.Story.of.the.Ordinarius.2025.1080p.NF.WEB-DL.DDP5.1.Atmos.H264-HHWEB-Sub-Viet.mkv?rlkey=7306m0qptvb0yqkvmqsssz5hz&st=7tacoodk&dl=0&dl=1"
},
{
    "id": 1069905,
    "title": "Jay Kelly",
    "original_title": "Jay Kelly",
    "overview": "Trong bộ phim đến từ ứng viên giải Oscar Noah Baumbach, ngôi sao điện ảnh Jay Kelly đối mặt với quá khứ và hiện tại trên hành trình đi khắp châu Âu cùng người quản lý tận tụy.",
    "poster_path": "https://image.tmdb.org/t/p/w500/bKLm1xS9DsODWB4i1SxTEvLXab9.jpg",
    "release_date": "2025-11-14",
    "vote_average": 5.833,
    "dropbox_link": "https://www.dropbox.com/scl/fi/elucle62tz4cbsz8qk7en/Jay.Kelly.2025.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-playWEB.mkv?rlkey=8lprdjbj7lknh4iq10zxfkdkg&st=r9v5e0t8&dl=0&dl=1"
},
{
    "id": 17979,
    "title": "Giáng Sinh Yêu Thương",
    "original_title": "A Christmas Carol",
    "overview": "Giáng Sinh Yêu Thương dựa trên tác phẩm văn học kinh điển cùng tên của đại văn hào Charles Dicken kể về lão già keo kiệt Miser Ebenezer Scrooge bị đánh thức trong Lễ Giáng Sinh bởi một hồn ma. Trong phim hay này, hồn ma đã cho lão thấy cuộc sống của lão khốn khổ chừng nào và một tương lai kinh khủng đang chờ lão. Lão nhận ra rằng cuộc sống của lão đã trở nên đắng cay và ích kỷ từng ngày, và lão phải lựa chọn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/cRipc1dxyMoNlT1z8Pooq0oSllm.jpg",
    "release_date": "2009-11-04",
    "vote_average": 6.9,
    "dropbox_link": "https://www.dropbox.com/scl/fi/abcasrzhy2hm07xmmnga6/A.Christmas.Carol.2009.1080p.BluRay.x264-EbP-TM-Khukhooo-HDVNBits.mkv?rlkey=98zohmip8x9wah0g1yznln6ho&st=0h11wi3s&dl=0&dl=1"
},
{
    "id": 1327862,
    "title": "Cuộc Tình Vụng Trộm",
    "original_title": "Regretting You",
    "overview": "Jonah và Chris là hai người bạn thân. Jenny và Morgan là hai chị em ruột. Nếu Chris và Jenny luôn ồn ào nhiệt huyết thì Jonah và Morgan lại sâu lắng và kiệm lời. Sau buổi dạ hội cuối cấp, Morgan thông báo mình có thai với Chris. Và cũng vào ngày hôm ấy, Jonal nói lời chia tay Jenny và rời đi.",
    "poster_path": "https://image.tmdb.org/t/p/w500/z4gVnxTaks3anTycwKjDmvQSuWt.jpg",
    "release_date": "2025-10-22",
    "vote_average": 7.035,
    "dropbox_link": "https://www.dropbox.com/scl/fi/rebow66b1c9dje1k2b7mo/Regretting.You.2025.1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-Kitsune.mkv?rlkey=qsp5nffav6pobufiukrm31s5l&st=01z47d0w&dl=0&dl=1"
},

{
    "id": 1434581,
    "title": "Rego Nyowo",
    "original_title": "Rego Nyowo",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/vzVESoM1YcGq2KltTLyIpG53fTW.jpg",
    "release_date": "2025-07-31",
    "vote_average": 3.667,
    "dropbox_link": "https://www.dropbox.com/scl/fi/8r7trwddgr6vzcanteios/Rego.Nyowo.2025.1080p.NF.WEB-DL.DD5.1.H.264-playWEB.mkv?rlkey=givlet2cqxserzsjrt0l63ays&st=bzvf7qb9&dl=0&dl=1"
},

{
    "id": 584242,
    "title": "热带雨",
    "original_title": "热带雨",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/3y3ayXbsoHGtxGBKb3oRLUHQ9ft.jpg",
    "release_date": "2019-11-22",
    "vote_average": 6.392,
    "dropbox_link": "https://www.dropbox.com/scl/fi/tu76towfwma9twgnmfrkc/Wet-Season-2019-Remux-BluRay-1080p-TrueHD-51x26510bit-MoiTinhCoTro.mkv?rlkey=4uzuy38nk5ca0661gfaarqy46&st=156rqp5p&dl=0&dl=1"
},
{
    "id": 1441563,
    "title": "Ông già Noel bí mật của tôi",
    "original_title": "My Secret Santa",
    "overview": "Một người mẹ đơn thân cần việc làm. Một khu nghỉ dưỡng trượt tuyết cần ông già Noel. Cải trang giống hệt Santa, liệu Taylor có lừa được vị thừa kế khách sạn quyến rũ thuê mình?",
    "poster_path": "https://image.tmdb.org/t/p/w500/tpOAzBasKPsKwsUtPZOx1Mzuqq3.jpg",
    "release_date": "2025-12-02",
    "vote_average": 6.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/powyr6cavgscbm6gmcskp/My.Secret.Santa.2025.1080p.NF.WEB-DL.DDP5.1.Atmos.H264-PandaQT.mkv?rlkey=t3rzdketajwcwuo78md6e9soq&st=vv5feylc&dl=0&dl=1"
},
{
    "id": 1323049,
    "title": "Bone Face",
    "original_title": "Bone Face",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/xky2SGq9Oz4pdD1J9T3yt3deU9U.jpg",
    "release_date": "2025-01-21",
    "vote_average": 3.7,
    "dropbox_link": "https://www.dropbox.com/scl/fi/gknutvl4eq9gxk21e7w2w/Bone.Face.2025.1080p.AMZN.WEB-DL.DD5.1.H.264-playWEB.mkv?rlkey=ha1ug73hzk3rw1q8xhk406srv&st=ylcbcfeh&dl=0&dl=1"
},
{
    "id": 1385969,
    "title": "Believe: The Ultimate Battle",
    "original_title": "Believe: Takdir, Mimpi, Keberanian",
    "overview": "Câu chuyện xoay quanh Agus, con trai của một cựu chiến binh, người lớn lên trong sự hỗn loạn và thiếu kỷ luật do bóng đen sự vắng mặt của cha để lại; khi người cha qua đời, Agus quyết định bước vào con đường quân ngũ, đối mặt với thử thách khắc nghiệt để trưởng thành, thấu hiểu di sản mà cha để lại và tìm thấy niềm tin cho chính cuộc đời mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/qP5wSoHngnDM1o6nzzUjv6CEiz5.jpg",
    "release_date": "2025-07-24",
    "vote_average": 5.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/3gjyls2och6pth5uuwysa/Believe.The.Ultimate.Battle.2025.1080p.NF.WEB-DL.DD5.1.H.264-playWEB-2.mkv?rlkey=eqw0ek3k2j8spkqhbdb3oktyc&st=yf3qeowd&dl=0&dl=1"
},
{
    "id": 9502,
    "title": "Kung Fu Gấu Trúc",
    "original_title": "Kung Fu Panda",
    "overview": "Khi kẻ xấu hùng mạnh phá hoại sự bình yên ở thung lũng của cậu, chú gấu trúc lười nhác đón nhận thử thách để đi theo định mệnh của mình – trở thành một võ hiệp.",
    "poster_path": "https://image.tmdb.org/t/p/w500/tfdrBWUU9geZULfRYty5J9EINvw.jpg",
    "release_date": "2008-06-04",
    "vote_average": 7.311,
    "dropbox_link": "https://www.dropbox.com/scl/fi/t56i82yrefnro0rhio4pf/Kung.Fu.Panda.2008.Vie.WEB-DL.1080p.DDP5.1.x264.mkv?rlkey=4mtm6k4szaylz6w782hipf0kt&st=cxxlqxdx&dl=0&dl=1"
},
{
    "id": 49444,
    "title": "Kung Fu Gấu Trúc 2",
    "original_title": "Kung Fu Panda 2",
    "overview": "Bụng no và sẵn sàng đánh đấm, Po dấn thân vào cuộc hành trình nguy hiểm cùng Ngũ Đại Hiệp để đối đầu với một kẻ thù mới đáng sợ và cứu nghệ thuật kungfu.",
    "poster_path": "https://image.tmdb.org/t/p/w500/fEpOEpKyz7SGelF73mHA27AgdF.jpg",
    "release_date": "2011-05-25",
    "vote_average": 7.054,
    "dropbox_link": "https://www.dropbox.com/scl/fi/zubun1tf5g924cxsjx7ak/Kung.Fu.Panda.2.2011.Vie.WEB-DL.1080p.DDP5.1.x264.mkv?rlkey=8zec2hvatf1a0qdsrf1a3uy9d&st=xhsr03mt&dl=0&dl=1"
},
{
    "id": 140300,
    "title": "Kung Fu Panda 3",
    "original_title": "Kung Fu Panda 3",
    "overview": "Trong khi Po và bố đến ngôi làng gấu trúc bí mật, một linh hồn xấu xa đe dọa toàn xứ Thần Châu, buộc cậu phải thành lập một đội quân bản xứ chắp vá.",
    "poster_path": "https://image.tmdb.org/t/p/w500/wmbbaf924GcYWZVbbyzZy8leJ1k.jpg",
    "release_date": "2016-01-23",
    "vote_average": 6.922,
    "dropbox_link": "https://www.dropbox.com/scl/fi/9wqo9rg96fzlc5y9h6wej/Kung.Fu.Panda.3.2016.VIE.DUB.Bluray.1080p.DD5.1.x264-L-ng-ti-ng.mkv?rlkey=zpjf2keuk47sajcgg43g5ic3h&st=mzjyb4n7&dl=0&dl=1"
},
{
    "id": 1011985,
    "title": "Kung Fu Panda 4",
    "original_title": "Kung Fu Panda 4",
    "overview": "Sau khi Po được chọn trở thành Thủ lĩnh tinh thần của Thung lũng Bình Yên, Po cần tìm và huấn luyện một Chiến binh Rồng mới, trong khi đó một mụ phù thủy độc ác lên kế hoạch triệu hồi lại tất cả những kẻ phản diện mà Po đã đánh bại về cõi linh hồn.",
    "poster_path": "https://image.tmdb.org/t/p/w500/7quq3UOaaB0qNM7TMGMEqqghLck.jpg",
    "release_date": "2024-03-02",
    "vote_average": 7.029,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ftehwlut5mmoufr0atsu8/Kung.Fu.Panda.4.2024-ViE-1080p.AMZN.WEB-DL.DDP5.1.Atmos.H.264-FLUX.mkv?rlkey=d8z24abad7bsc2306o6pylq8r&st=mo8mmfmn&dl=0&dl=1"
},
{
    "id": 736526,
    "title": "Troll: Quỷ núi khổng lồ",
    "original_title": "Troll",
    "overview": "Khi một vụ nổ ở vùng núi Na Uy đánh thức con quỷ núi khổng lồ cổ đại, các quan chức chỉ định một nhà cổ sinh vật học gan góc ngăn chặn cuộc tàn phá chết chóc của nó.",
    "poster_path": "https://image.tmdb.org/t/p/w500/mchfYMnYpRSGMI2YlqDq9pAv1LV.jpg",
    "release_date": "2022-11-30",
    "vote_average": 6.583,
    "dropbox_link": "https://www.dropbox.com/scl/fi/phmkpdv60z3vp6kdikb96/Troll.2022.1080p.NF.WEB-DL.DUAL.DDP5.1.Atmos.H.264-SMURF-Sub-Viet.mkv?rlkey=2k5uf0yrffhkcicjyg592jxbk&st=7bcf6cut&dl=0&dl=1"
},
{
    "id": 628847,
    "title": "Báo Thủ Báo Nhà",
    "original_title": "Trap House",
    "overview": "Một đặc vụ DEA chìm và cộng sự của anh ta bắt đầu cuộc rượt đuổi mèo vờn chuột với một nhóm trộm táo tợn và đáng ngạc nhiên – chính là những đứa con tuổi teen nổi loạn của họ, những kẻ đã bắt đầu cướp bóc từ một băng đảng ma túy nguy hiểm, sử dụng chiến thuật và thông tin tình báo tối mật của cha mẹ chúng để thực hiện điều đó.",
    "poster_path": "https://image.tmdb.org/t/p/w500/e39G8lKvuyvWy7ZoeTMp6LnFJMG.jpg",
    "release_date": "2025-11-14",
    "vote_average": 6.306,
    "dropbox_link": "https://www.dropbox.com/scl/fi/9ih9uft93sxm4q7020rig/Trap.House.2025.1080p.AMZN.WEB-DL.DDP5.1.H.264-FLUX.mkv?rlkey=09cag7verki69ac51w9wlvdyv&st=1t9ye74i&dl=0&dl=1"
},
{
    "id": 1314754,
    "title": "Đường Mòn Báo Thù",
    "original_title": "Trail of Vengeance",
    "overview": "Lấy bối cảnh năm 1875, câu chuyện xoay quanh một góa phụ có cuộc sống bị đảo lộn sau khi chồng cô bị sát hại dưới kế hoạch tàn độc của một viên đại tá. Trong hành trình tìm công lý và trả thù, cô tình cờ gặp một cựu đặc vụ Pinkerton mang quá khứ đầy tổn thương, và cả hai cùng dấn thân vào hành trình đối đầu thế lực đen tối đứng sau tội ác.",
    "poster_path": "https://image.tmdb.org/t/p/w500/y6P0tUlkDw8Jc4BiuNKKw6KFjHU.jpg",
    "release_date": "2025-05-23",
    "vote_average": 3.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/41y1lm4fkcbwfg8be7r85/Trail-of-Vengeance-2025-ViE-Remux-1080p-GER-Blu-ray-AVC-DTS-HD-MA-5.1.mkv?rlkey=a2tc7k0cw79qacduzo2jlrsmu&st=pea5hn3v&dl=0&dl=1"
},
{
    "id": 273248,
    "title": "Tám Mối Hận",
    "original_title": "The Hateful Eight",
    "overview": "Nhiều năm sau Nội chiến, một thợ săn tiền thưởng và con tin của anh ta bị trận bão tuyết ở Wyoming cản bước. Họ bèn ẩn náu trong một nhà ga cùng sáu người lạ khó đoán và nguy hiểm.",
    "poster_path": "https://image.tmdb.org/t/p/w500/jft4NERh6O67KLLXX5MIIRkaGn9.jpg",
    "release_date": "2015-12-25",
    "vote_average": 7.756,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ih5tsvdt72b0h5fez876k/The-Hateful-Eight-2015-1080p-BluRay-DTS-x264-TayTO.mkv?rlkey=jks58jfucmlvmifowc8uxszfk&st=54lxguf5&dl=0&dl=1"
},
{
    "id": 1242898,
    "title": "Quái Thú Vô Hình: Vùng Đất Chết Chóc",
    "original_title": "Predator: Badlands",
    "overview": "Trong tương lai, tại một hành tinh hẻo lánh, một Predator non nớt - kẻ bị chính tộc của mình ruồng bỏ - tìm thấy một đồng minh không ngờ tới là Thia và bắt đầu hành trình sinh tử nhằm truy tìm kẻ thù tối thượng. Bộ phim do Dan Trachtenberg - đạo diễn của Prey chỉ đạo và nằm trong chuỗi thương hiệu Quái Thú Vô Hình Predator.",
    "poster_path": "https://image.tmdb.org/t/p/w500/6aPy2tMgQLVz2IcifrL1Z2Q9u1t.jpg",
    "release_date": "2025-11-05",
    "vote_average": 7.4,
    "dropbox_link": "https://www.dropbox.com/scl/fi/pldr8yoki9kaj5tc2rict/Predator.Badlands.2025.ViE-1080p-WEB-DL-DDP.5.1.H265-ZAX.mkv?rlkey=vfs55aqx5429uex5hyczgncyj&st=ehrgaaub&dl=0&dl=1"
},
{
    "id": 479455,
    "title": "Đặc Vụ Áo Đen: Sứ Mệnh Toàn Cầu",
    "original_title": "Men in Black: International",
    "overview": "Những đặc vụ áo đen là người bảo vệ trái đất khỏi mối đe dọa từ các sinh vật ngoài hành tinh. Trong cuộc phiêu lưu mới này, nhiệm vụ của họ ngày càng trở nên nguy hiểm hơn khi phải đối đầu với một nội gián trong chính tổ chức của mình. Men In Black International là spin-off của siêu phẩm Men In Black nổi tiếng, do Chris Hemsworth, Tessa Thompson và Lian Neeson thủ vai chính.",
    "poster_path": "https://image.tmdb.org/t/p/w500/1xfLyWJhyDZATM4o3G04uepMQtF.jpg",
    "release_date": "2019-06-12",
    "vote_average": 5.9,
    "dropbox_link": "https://www.dropbox.com/scl/fi/ewkx33l8ryd9fbbpem1td/Men-in-Black-International-2019-ViE-AMZN-WEB-DL-1080p-DDP-5.1-H264-NTG.mkv?rlkey=qw2epx21ngimjaajegj90i1th&st=x8po07je&dl=0&dl=1"
},
{
    "id": 999075,
    "title": "Cô gái tay chiêu",
    "original_title": "左撇子女孩",
    "overview": "Một người mẹ và hai cô con gái chuyển đến Đài Bắc để mở một tiệm mì tại khu chợ đêm sôi động, song những bí mật gia đình và quan niệm truyền thống thử thách khởi đầu mới của họ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/9RwFA1tHOpblukY0sBsW1AuNDnE.jpg",
    "release_date": "2025-09-17",
    "vote_average": 7.6,
    "dropbox_link": "https://www.dropbox.com/scl/fi/two9i3kj98rs4fnsrooz3/Left-Handed.Girl.2025.1080p.NF.WEB-DL.DDP5.1.H264-HHWEB-Sub-Viet.mkv?rlkey=zrzow2duzy2009b5ofvwpoirg&st=1y4mdgh1&dl=0&dl=1"
},
{
    "id": 1576166,
    "title": "Giá Như Cha Cho Con Biết",
    "original_title": "Sana Sinabi Mo",
    "overview": "Sau khi phát hiện bí mật giấu kín từ lâu của người cha quá cố, nhà truyền giáo trẻ nọ đi từ Philippines đến Tây Ban Nha để tìm kiếm mối tình bị cấm đoán của cha mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/qKuos4fGcntgeXXgR3NAmTU0kOU.jpg",
    "release_date": "2025-12-04",
    "vote_average": 7.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/tk9mmt8e5rpcxt8t5kgvz/I.Wish.You.Had.Told.Me.2025.1080p.NF.WEB-DL.DDP5.1.H264-HHWEB-Sub-Viet.mkv?rlkey=uppf36r7npa7g6pcmaxiy4xw3&st=w8a3bjd3&dl=0&dl=1"
},
{
    "id": 1396965,
    "title": "Thám Tử Lừng Danh Conan: Dư Ảnh Của Độc Nhãn",
    "original_title": "名探偵コナン 隻眼の残像（フラッシュバック）",
    "overview": "Thám Tử Lừng Danh Conan 28: Dư Ảnh Của Độc Nhãn – Trên những ngọn núi tuyết của Nagano, một vụ án bí ẩn đã đưa Conan và các thám tử quay trở lại quá khứ. Thanh tra Yamato Kansuke - người đã bị thương nặng trong một trận tuyết lở nhiều năm trước - bất ngờ phải đối mặt với những ký ức đau thương của mình trong khi điều tra một vụ tấn công tại Đài quan sát Nobeyama. Cùng lúc đó, Mori Kogoro nhận được một cuộc gọi từ một đồng nghiệp cũ, tiết lộ mối liên hệ đáng ngờ giữa anh ta và vụ án đã bị lãng quên từ lâu. Sự xuất hiện của Morofushi Takaaki, cùng với những nhân vật chủ chốt như Amuro Tooru, Kazami và cảnh sát Tokyo, càng làm phức tạp thêm cuộc điều tra. Khi quá khứ và hiện tại đan xen, một bí ẩn rùng rợn dần dần được hé lộ - và ký ức của Kansuke nắm giữ chìa khóa cho mọi thứ.",
    "poster_path": "https://image.tmdb.org/t/p/w500/8iuOKfhsRUoOLuufXWyK89HpIPC.jpg",
    "release_date": "2025-04-18",
    "vote_average": 7.5,
    "dropbox_link": "https://www.dropbox.com/scl/fi/3hbc4gtlepfvlbup0frb1/Detective.Conan.One-eyed.Flashback.2025.1080p.BluRay.DTS.x265.10bit-ADE-Sub-Viet.mkv?rlkey=bu8m4ez2qhklgev0zcazokpwc&st=xw73qpn0&dl=0&dl=1"
},
{
    "id": 517096,
    "title": "Quái Thú Sao Hỏa",
    "original_title": "Вратарь Галактики",
    "overview": "Quái thú sao hỏa - Cosmoball : Bộ phim lấy bối cảnh tương lai, hậu khải huyền ở một thành phố tại trái đất, khi mà cuộc chiến tranh giữa các thiên hà đã làm cho nơi này trở thành khô cằn và đầy bệnh dịch. Để cứu lấy trái đất, thủ lĩnh của hội Nghiên cứu của hội đồng ngân hà đã tạo một con tàu khổng lồ với hình dáng của một cây hoa bồ công anh, bên trong là một sân vận động lớn, để tổ chức các giải đấu Cosmoball, để chuẩn bị cho cuộc chiến với kẻ tội phạm nguy hiểm nhất dải ngân hà. Và những vận động viên cuối cùng cũng sẽ là những người bảo vệ cho người dân trái đất khi chẳng may chiến tranh nổ ra. Số phận của trái đất cũng phụ thuộc vào cuộc chiến cuối cùng này",
    "poster_path": "https://image.tmdb.org/t/p/w500/1AkgB1GoseuOB0i14uC185oqmCz.jpg",
    "release_date": "2020-08-27",
    "vote_average": 6.335,
    "dropbox_link": "https://www.dropbox.com/scl/fi/wdlmjq2di1gte4o6p7qx0/Cosmoball-2020-ViE-1080p-BluRay-Remux-AVC-DTS-HD-MA-5.1-MBH-Thuyet-Minh-Sub-Viet.mkv?rlkey=7xap7bwi8qj6j9o5oowz3tcdf&st=4q3n2kyu&dl=0&dl=1"
},
{
    "id": 198184,
    "title": "Chappie",
    "original_title": "Chappie",
    "overview": "Bộ phim Chappie xoay quanh câu chuyện về một chú robot của lực lượng cảnh sát Johannesburg, bị hỏng sau một trận đánh, Chappie được một nhà khoa học trẻ khôi phục lại và “thổi hồn” vào biến cậu thành khác biệt. Chappie có linh hồn, có tình cảm và có suy nghĩ như một con người. Ẩn trong vẻ ngoài lạnh lùng cứng nhắc của một robot cảnh sát, linh hồn Chappie non nớt và ngây thơ như một đứa trẻ. Và hơn bao giờ hết, cậu có một niềm thiết tha mãnh liệt với cuộc sống.",
    "poster_path": "https://image.tmdb.org/t/p/w500/hvLi76WpH1h5wTYu5dtQBtC9b29.jpg",
    "release_date": "2015-03-04",
    "vote_average": 6.786,
    "dropbox_link": "https://www.dropbox.com/scl/fi/v42gt7lv8vsregjicxllh/Chappie.2015.ViE.1080p.BluRay.DD7.1.x264-playHD-Vietsub-TM.mkv?rlkey=3y8bmadebxcqxs6r5v86729i4&st=ox00qkgg&dl=0&dl=1"
},
{
    "id": 484641,
    "title": "Sát Thủ Anna",
    "original_title": "Anna",
    "overview": "Với kỹ năng chiến đấu thiện nghệ cùng sắc đẹp khó cưỡng, 'chị đẹp' Anna khiến khán giả phải nghẹt thở khi chứng kiến những pha hành động 'cân cả thế giới' của mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/iuePVURusUkjwtrlOJCsgzo3EWG.jpg",
    "release_date": "2019-06-19",
    "vote_average": 6.707,
    "dropbox_link": "https://www.dropbox.com/scl/fi/kckfjm9ijut2in01nxrdx/Anna.2019.ViE.Hybrid.1080p.BluRay.DDP7.1.x264-prldm.mkv?rlkey=hl51aj34r76o27vsfzvazsost&st=x267ie66&dl=0&dl=1"
},
{
    "id": 592742,
    "title": "Cuộc Chơi Thân Xác",
    "original_title": "私の奴隷になりなさい 第2章 「ご主人様と呼ばせてください」",
    "overview": "Phim 'Be My Master' (2018) kể về Meguro, một nhà thiết kế quảng cáo đã có vợ nhưng lại vướng vào mối quan hệ ngoài luồng với Miyin, một người phụ nữ quyến rũ và bí ẩn. Khi một khách hàng lớn – đồng thời là giám đốc một công ty quảng cáo – xuất hiện và có liên quan đến Miyin, mọi chuyện trở nên phức tạp. Chồng của Miyin, Shanwei, biết chuyện nhưng lại ép Meguro tiếp tục mối quan hệ để giữ thể diện và địa vị xã hội. Phim khai thác sâu sắc những mâu thuẫn giữa tình yêu, đạo đức và danh vọng trong xã hội hiện đại.",
    "poster_path": "https://image.tmdb.org/t/p/w500/8b5t20EVVOpojz3LO11NifeiEWO.jpg",
    "release_date": "2018-09-29",
    "vote_average": 6.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/yvmk0erqt9jypsdlg3fhj/Be.My.Master.2018.BluRay.1080p.DTS-HDMA.5.1.x265.10bit-CHD-Vietsub-1.mkv?rlkey=wrhyj34std7je1kmg5eqlrf7a&st=pixejebo&dl=0&dl=1"
},
{
    "id": 1299655,
    "title": "Trăng Xanh",
    "original_title": "Blue Moon",
    "overview": "Đêm 31-3-.1943 tại Sardi’s, Lorenz Hart đối diện bóng tối trong chính mình, còn Richard Rodgers ăn mừng “Oklahoma!” làm rung chuyển Broadway. Một khoảnh khắc định mệnh của hai người cộng sự tri âm giữa hào quang và nỗi cô độc.",
    "poster_path": "https://image.tmdb.org/t/p/w500/dVU7SNc6dgStTVdtbPLQncWxsyZ.jpg",
    "release_date": "2025-10-17",
    "vote_average": 6.871,
    "dropbox_link": "https://www.dropbox.com/scl/fi/67z76do73jpwoo015cy46/Blue.Moon.2025.1080p.WEB.H264-SLOT.mkv?rlkey=o6f3q5ecobcnwgn62g4otlvhi&st=dk1122ep&dl=0&dl=1"
},
{
    "id": 1325697,
    "title": "Breed of Greed",
    "original_title": "Breed of Greed",
    "overview": "",
    "poster_path": "https://image.tmdb.org/t/p/w500/31NpTFAZVsuxWEWv9XjVuRtqHX2.jpg",
    "release_date": "2025-09-26",
    "vote_average": 4.8,
    "dropbox_link": "https://www.dropbox.com/scl/fi/miqoqojzuw9kl23yx6knr/Breed.of.Greed.2025.1080p.AMZN.WEB-DL.DD5.1.H.264-playWEB.mkv?rlkey=9lr47jd8c35kjmq4sc9mqxnic&st=zz5d4gdf&dl=0&dl=1"
},
{
    "id": 1246049,
    "title": "Dracula: Bản Tình Ca Bất Diệt",
    "original_title": "Dracula",
    "overview": "Một hoàng tử tuyệt vọng biến thành Dracula và lang thang bất tận qua thời gian, sống chỉ vì lời hứa tìm lại tình yêu của đời mình.",
    "poster_path": "https://image.tmdb.org/t/p/w500/vevuZVvb72VrbDzHiz4D8Z8XuGF.jpg",
    "release_date": "2025-07-30",
    "vote_average": 7.11,
    "dropbox_link": "https://www.dropbox.com/scl/fi/5nvolu1mf26fm68jy46rz/Dracula.A.Love.Tale.2025.1080p.WEB.H264-SLOT.mkv?rlkey=lfjpu0wr3mox9f3bxcnlod9pg&st=jnps19o2&dl=0&dl=1"
},
];
